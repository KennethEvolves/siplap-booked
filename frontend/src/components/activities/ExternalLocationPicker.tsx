'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { ExternalLocationInput } from '@/lib/api';

type GooglePlace = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number };
};

type PlaceAutocompleteElement = HTMLElement & {
  placeholder: string;
  includedRegionCodes: string[];
  addEventListener: (type: 'gmp-select', listener: (event: Event) => void) => void;
  removeEventListener: (type: 'gmp-select', listener: (event: Event) => void) => void;
};

type PlacePredictionSelectEvent = Event & {
  placePrediction?: { toPlace: () => GooglePlace & { fetchFields: (options: { fields: string[] }) => Promise<void> } };
};

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: 'places') => Promise<{
          PlaceAutocompleteElement: new () => PlaceAutocompleteElement;
        }>;
      };
    };
  }
}

interface ExternalLocationPickerProps {
  locations: ExternalLocationInput[];
  onChange: (locations: ExternalLocationInput[]) => void;
  disabled?: boolean;
}

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function ExternalLocationPicker({ locations, onChange, disabled = false }: ExternalLocationPickerProps) {
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const locationsRef = useRef(locations);
  const onChangeRef = useRef(onChange);
  const [mapsReady, setMapsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  useEffect(() => {
    locationsRef.current = locations;
    onChangeRef.current = onChange;
  }, [locations, onChange]);

  useEffect(() => {
    let active = true;
    let autocomplete: PlaceAutocompleteElement | undefined;
    let listener: ((event: Event) => void) | undefined;

    const initializeAutocomplete = async () => {
      const container = autocompleteContainerRef.current;
      const importLibrary = window.google?.maps?.importLibrary;
      if (!mapsReady || !container || !importLibrary) return;

      try {
        const { PlaceAutocompleteElement: PlaceAutocomplete } = await importLibrary('places');
        if (!active || !autocompleteContainerRef.current) return;

        autocomplete = new PlaceAutocomplete();
        autocomplete.placeholder = 'Buscar lugar en Google Maps';
        autocomplete.includedRegionCodes = ['mx'];
        autocomplete.className = 'w-full';
        autocomplete.style.width = '100%';
        autocomplete.style.minHeight = '42px';
        listener = async (rawEvent: Event) => {
          const event = rawEvent as PlacePredictionSelectEvent;
          const place = event.placePrediction?.toPlace();
          if (!place) {
            setSelectionError('No se pudo obtener la ubicación seleccionada. Inténtalo de nuevo.');
            return;
          }

          try {
            await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
            const point = place.location;
            if (!place.id || !point) {
              setSelectionError('Google Maps no devolvió las coordenadas de este lugar. Selecciona otra sugerencia.');
              return;
            }

            const next: ExternalLocationInput = {
              googlePlaceId: place.id,
              name: place.displayName?.trim() || place.formattedAddress || 'Lugar externo',
              formattedAddress: place.formattedAddress ?? null,
              latitude: point.lat(),
              longitude: point.lng(),
            };
            if (locationsRef.current.some((location) => location.googlePlaceId === next.googlePlaceId)) {
              setSelectionError('Ese lugar ya está agregado a la actividad.');
            } else {
              setSelectionError('');
              onChangeRef.current([...locationsRef.current, next]);
            }
          } catch {
            setSelectionError('No se pudieron cargar los detalles del lugar. Inténtalo de nuevo.');
          }
        };
        autocomplete.addEventListener('gmp-select', listener);
        container.replaceChildren(autocomplete);
      } catch {
        setLoadError(true);
      }
    };

    void initializeAutocomplete();
    return () => {
      active = false;
      if (autocomplete && listener) autocomplete.removeEventListener('gmp-select', listener);
      autocomplete?.remove();
    };
  }, [mapsReady]);

  const removeLocation = (placeId: string) => {
    onChange(locations.filter((location) => location.googlePlaceId !== placeId));
  };

  const addManualLocation = () => {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!manualName.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setSelectionError('Escribe el nombre del lugar y coordenadas válidas (latitud −90 a 90, longitud −180 a 180).');
      return;
    }
    const googlePlaceId = `manual-${latitude.toFixed(6)}-${longitude.toFixed(6)}`;
    if (locations.some((location) => location.googlePlaceId === googlePlaceId)) {
      setSelectionError('Ya agregaste una ubicación con esas coordenadas.');
      return;
    }
    onChange([...locations, {
      googlePlaceId,
      name: manualName.trim(),
      formattedAddress: manualAddress.trim() || null,
      latitude,
      longitude,
    }]);
    setManualName('');
    setManualAddress('');
    setManualLatitude('');
    setManualLongitude('');
    setSelectionError('');
  };

  const manualSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(manualAddress || manualName || 'lugares')}`;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-background p-4">
      {apiKey && (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly&language=es&region=MX&auth_referrer_policy=origin`}
          strategy="afterInteractive"
          onReady={() => setMapsReady(Boolean(window.google?.maps?.importLibrary))}
          onError={() => setLoadError(true)}
        />
      )}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-primary" /> Ubicaciones externas
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Busca y agrega uno o varios lugares. Se guardarán junto con la actividad.
        </p>
      </div>
      {apiKey ? (
        <>
          <div
            ref={autocompleteContainerRef}
            aria-label="Buscar lugares externos en Google Maps"
            aria-busy={!mapsReady}
            className={`min-h-11 w-full overflow-hidden rounded-xl border border-input bg-card ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          />
          {!mapsReady && !loadError && <p className="text-xs text-muted-foreground">Cargando Google Maps…</p>}
          {loadError && <p role="alert" className="text-xs text-destructive">Google Maps no pudo cargarse. Revisa la clave y la API Places habilitada.</p>}
          {selectionError && <p role="alert" className="text-xs text-destructive">{selectionError}</p>}
        </>
      ) : (
        <div className="space-y-3 rounded-xl bg-secondary p-3">
          <p className="text-xs text-muted-foreground">Puedes buscar el lugar en Google Maps y capturar sus coordenadas aquí. Esta alternativa funciona sin API key; si configuras Places API, también aparecerán sugerencias automáticas.</p>
          <a className="inline-flex rounded-lg border border-primary/30 bg-card px-3 py-2 text-xs font-semibold text-primary underline" href={manualSearchUrl} target="_blank" rel="noreferrer">Buscar lugar en Google Maps ↗</a>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-foreground">Nombre del lugar<input value={manualName} onChange={(event) => setManualName(event.target.value)} disabled={disabled} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="Auditorio, edificio…" /></label>
            <label className="space-y-1 text-xs font-medium text-foreground">Dirección<input value={manualAddress} onChange={(event) => setManualAddress(event.target.value)} disabled={disabled} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="Dirección o referencia" /></label>
            <label className="space-y-1 text-xs font-medium text-foreground">Latitud<input type="number" step="any" min="-90" max="90" value={manualLatitude} onChange={(event) => setManualLatitude(event.target.value)} disabled={disabled} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="20.6896" /></label>
            <label className="space-y-1 text-xs font-medium text-foreground">Longitud<input type="number" step="any" min="-180" max="180" value={manualLongitude} onChange={(event) => setManualLongitude(event.target.value)} disabled={disabled} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="-88.2011" /></label>
          </div>
          <p className="text-[11px] text-muted-foreground">En Google Maps, haz clic derecho sobre el punto y copia las coordenadas (latitud, longitud).</p>
          <button type="button" onClick={addManualLocation} disabled={disabled} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Agregar ubicación</button>
          {selectionError && <p role="alert" className="text-xs text-destructive">{selectionError}</p>}
        </div>
      )}
      {locations.length > 0 && (
        <ul className="space-y-2" aria-label="Lugares seleccionados">
          {locations.map((location) => (
            <li key={location.googlePlaceId} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{location.name}</p>
                <p className="text-xs text-muted-foreground">{location.formattedAddress || `${location.latitude}, ${location.longitude}`}</p>
                <a
                  className="mt-1 inline-block text-xs text-primary underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}&query_place_id=${encodeURIComponent(location.googlePlaceId)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en Google Maps
                </a>
              </div>
              <button type="button" onClick={() => removeLocation(location.googlePlaceId)} disabled={disabled} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Quitar ${location.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
