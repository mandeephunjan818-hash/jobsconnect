'use client';

import { useCallback, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Autocomplete, Marker } from '@react-google-maps/api';

export interface Location {
  address: string;
  lat: number;
  lng: number;
  mapsIframe: string;   // auto‑generated embed URL
}

interface Props {
  value: Location;
  onChange: (loc: Location) => void;
}

const libraries: 'places'[] = ['places'];
const containerStyle = { width: '100%', height: '300px' };

export default function LocationPicker({ value, onChange }: Props) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = () => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || '';

    // Build a Google Maps embed URL using the place ID (most reliable)
    let mapsIframe = '';
    if (place.place_id && apiKey) {
      // Google Maps Embed API (requires a separate Embed API key or reuse the same)
      mapsIframe = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${place.place_id}`;
    } else {
      // Fallback: use coordinates (still needs the Embed API)
      mapsIframe = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}`;
    }

    // Pan the map to the new location
    map?.panTo({ lat, lng });

    // Update parent with the complete location object
    onChange({ address, lat, lng, mapsIframe });
  };

  if (!apiKey) {
    return <div className="alert alert-warning">Missing Google Maps API key</div>;
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          className="form-control bg-secondary mb-2"
          placeholder="Search for your location"
          defaultValue={value.address}
        />
      </Autocomplete>

      {value.lat && value.lng ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: value.lat, lng: value.lng }}
          zoom={14}
          onLoad={setMap}
        >
          <Marker position={{ lat: value.lat, lng: value.lng }} />
        </GoogleMap>
      ) : null}
    </LoadScript>
  );
}