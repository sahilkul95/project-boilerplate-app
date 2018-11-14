// import { withScriptjs, withGoogleMap, GoogleMap, Marker } from "react-google-maps";
//
// export const MyMapComponent = withScriptjs(withGoogleMap((props) =>
//   <GoogleMap
//     defaultZoom={8}
//     defaultCenter={{ lat: 18.516178, lng: 73.849029 }}
//   >
//     {props.isMarkerShown && <Marker position={{ lat: 18.516178, lng: 73.849029 }} />}
//   </GoogleMap>
// ));

import { Component } from 'preact';
import GoogleMapReact from 'google-map-react';
import CONSTANTS from '../../lib/constants';
import Marker from './Marker';

class SimpleMap extends Component {

  componentWillMount() {
    this.state = {
      markerText: this.props.markerText
    };
  }

  render(props) {
    return (
      // Important! Always set the container height explicitly
      <div style="position:absolute; width:100%;" id="map">
        <GoogleMapReact
          bootstrapURLKeys={{ key: CONSTANTS.googleMapsAPIKey }}
          defaultCenter={CONSTANTS.puneCoords}
          defaultZoom={12}
          layerTypes={['TransitLayer']}
        >
          <Marker
            lat={props.lat}
            lng={props.lng}
            altText={props.altText}
            markerContent={props.markerContent}
          />
        </GoogleMapReact>
      </div>
    );
  }
}

export default SimpleMap;
