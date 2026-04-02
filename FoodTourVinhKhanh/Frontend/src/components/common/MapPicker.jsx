import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix lỗi icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationPickerMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return position.latitude ? <Marker position={[position.latitude, position.longitude]} /> : null;
};

const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

// Component chính để export
const MapPicker = ({ position, setPosition }) => {
  return (
    <MapContainer 
      center={[position.latitude, position.longitude]} 
      zoom={15}
      maxZoom={18}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationPickerMarker position={position} setPosition={setPosition} />
      <RecenterAutomatically lat={position.latitude} lng={position.longitude} />
    </MapContainer>
  );
};

export default MapPicker;