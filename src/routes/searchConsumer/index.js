import { h, Component } from 'preact';
// import { route } from 'preact-router';
import { Modal, ModalBody } from '../../components/modal';
import SimpleMap from '../../components/map';
// import Map from 'react-js-google-maps';
// import Pagination from '../../components/pagination';
// import NavigationDropdown from '../../components/navigationDropdown';
import { Toast } from '../../lib/toastr';
import { startLoader, stopLoader } from '../../lib/utils';
// import linkState from 'linkstate';
import http from 'fetch-bb';
import CONSTANTS from '../../lib/constants';
import { AppStore } from '../../lib/store';
import imageCompression from 'browser-image-compression';
let file;

export default class SearchConsumer extends Component {

  componentWillMount() {
    this.state = {
      billMonths: {
        1: 'Jan',
        2: 'Feb',
        3: 'Mar',
        4: 'Apr',
        5: 'May',
        6: 'Jun',
        7: 'Jul',
        8: 'Aug',
        9: 'Sept',
        10: 'Oct',
        11: 'Nov',
        12: 'Dec' },
      consumer: {},
      budgetCategoryList: [],
      latitude: '',
      longitude: '',
      isShowLocation: false,
      file: null,
      userInfo: AppStore.get('userinfo'),
      googleMapModal: false,
      selectedFilePath: '',
      locationMessageModal: false,
      locationAccess: ''
    };
  }

  toggleLocationMessageModal() {
    this.setState({locationMessageModal: !this.state.locationMessageModal});
  }

  getConsumerDetails() {
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.matches.consumerID}`)
      .then((response) => {
        let promise = [];
        let consumer = JSON.parse(JSON.stringify(response));
        let stateObject = {};
        if (consumer.longitude) {
          stateObject.longitude = consumer.longitude;
          stateObject.isShowLocation = true;
        }
        if (consumer.latitude) stateObject.latitude = consumer.latitude;
        if (consumer.meterFileID) {
          promise.push(this.getFile(consumer));
          stateObject.file = null;
        }
        return Promise.all(promise)
          .then(() => {
            stateObject.consumer = consumer;
            this.setState(stateObject);
            stopLoader();
          });
      });
  }

  getBudgetCategoryList() {
    return http.get(`${CONSTANTS.API_URL}/api/budgetCategory`)
      .then((budgetCategory) => {
        this.setState({budgetCategoryList: budgetCategory});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getFile(consumer) {
    //Call Get file api
    return http.get(`${CONSTANTS.API_URL}/api/files`, {fileIDs: [consumer.meterFileID]})
      .then((files) => {
        files.map((file) => {
          consumer.signedURL = file.signedURL;
          consumer.fileName = file.name;
        });
      });
  }

  checkFileSize(e) {
    file = e.target;
    if (e.target.files[0].size > 5242880) {
      new Toast('File size should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
      this.setState({receiptFile: null});
      return e.target.value = null;
    }
    this.setState({file: e.target.value, selectedFilePath: e.target.files[0].name});
    // this.readURL(file);
  }

  removeFile() {
    file = null;
    this.setState({file: null});
  }

  readURL(input) {
    if (input.files && input.files[0]) {
      let reader = new FileReader();

      reader.onload = function(e) {
        document.getElementById('showFile').data = e.target.result;
        document.getElementById('displayFile').style.display = '';
        document.getElementById('displayFile').style.display = 'inline';
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  updateConsumer() {
    startLoader();
    let imageFile = file.files[0];
    let maxSizeMB = 0.09;
    let maxWidthOrHeight = 900; // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight
    imageCompression(imageFile, maxSizeMB, maxWidthOrHeight) // maxSizeMB, maxWidthOrHeight are optional
      .then((compressedFile) => {
        let fileData = '';
        let fileObj = {};
        if (file.files[0].size > 80000) {
          fileData = compressedFile;
          fileObj.name= compressedFile.name;
          fileObj.size= compressedFile.size;
          fileObj.type= imageFile.type;
          fileObj.value= file.value;
        } else {
          fileData = imageFile;
          fileObj.name= imageFile.name;
          fileObj.size= imageFile.size;
          fileObj.type= imageFile.type;
          fileObj.value= file.value;
        }

        return http.post(`${CONSTANTS.API_URL}/api/file/getSignedUrl`,
          {
            file: fileObj
          })
          .then((fileDetails) => {
            this.uploadConsumerFile(fileDetails, fileData);
          })
          .catch((HTTPException) => {
            stopLoader();
            new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
            console.error(HTTPException.message);
          });
      })
      .catch((error) => {
        stopLoader();
        console.log(error.message);
      });
  }

  uploadConsumerFile(fileDetails, fileData) {
    const opts = {
      headers: [{
        name: 'Content-Type',
        value: 'multipart/form-data'
      }]
    };
    return http.put(fileDetails.signedURL, fileData, opts)
      .then(() => {
        return http.put(`${CONSTANTS.API_URL}/api/consumer/${this.state.consumer._id}`, {
          meterFileID: fileDetails._id
        })
          .then(() => {
            new Toast('File uploaded successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
            this.getConsumerDetails();
          });
      });
  }

  getGeoLocation() {
    if (this.state.isShowLocation) {
      this.updateLocation();
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this.showPosition.bind(this));
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  showPosition(position) {
    this.setState({latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7)});
  }

  showLocation() {
    this.updateLocation()
      .then(() => {
        this.setState({isShowLocation: true});
      });
  }

  updateLocation() {
    return this.checkLocationAccess()
      .then(() => {
        if (this.state.locationAccess !== 'denied') {
          return new Promise((resolve, reject) => {
            return http.put(`${CONSTANTS.API_URL}/api/consumer/${this.state.consumer._id}`, {
              longitude: this.state.longitude,
              latitude: this.state.latitude
            })
              .then(() => {
                new Toast('Location updated successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
                this.setState({locationMessageModal: !this.state.locationMessageModal});
                return resolve();
              })
              .catch((HTTPException) => {
                stopLoader();
                new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
                console.error(HTTPException.message);
                return reject();
              });
          });
        }
      });
  }

  openBrowseMenu() {
    document.getElementById('browse').click();
  }

  checkLocationAccess() {
    return navigator.permissions.query({
      name: 'geolocation'
    }).then((result) => {
      if (result.state === 'granted') {
        console.log(result.state);
      } else if (result.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(this.showPosition.bind(this));
        console.log(result.state);

      } else if (result.state === 'denied') {
        console.log(result.state);
        new Toast('Please allow this app to access your location.', Toast.TYPE_WARNING, Toast.TIME_NORMAL);
      }
      this.setState({locationAccess: result.state});
      result.onchange = function() {
        console.log(result.state);
      };
    });
  }

  toggleMapModal(e) {
    e.preventDefault();
    if (this.state.locationMessageModal) {
      this.setState({locationMessageModal: false});
    }
    this.setState({googleMapModal: !this.state.googleMapModal});
  }

  componentDidMount() {
    this.getGeoLocation();
    let promises = [this.getConsumerDetails(), this.getBudgetCategoryList()];
    startLoader();
    return Promise.all(promises)
      .then(() => {
        stopLoader();
      });
  }

  setMarker(map) {
    const uluru = { lat: 18.516178, lng: 73.849029 };
    const marker = new window.google.maps.Marker({
      position: uluru,
      map
    });
    window.google.maps.event.addListener(marker, 'click', () => {
      const infoWindow = new window.google.maps.InfoWindow({
        content: "<b>Your Current Location</b>"
      });
      infoWindow.open(map, marker);
    });
  }

  render({}, state) {
    // const mapOptions = {
    //   zoom: 12,
    //   center: { lat: CONSTANTS.pune.lat, lng: CONSTANTS.pune.lng }
    // };
    return (
      <div>
        <section>
          <div class="no-padding">
            {
              Object.keys(state.consumer).length > 0 &&
              <div class="box">
                <div class="row">
                  <div class="table-responsive col-xs-12 col-sm-12 col-md-12 col-lg-12">
                    <h7 style="font-size: 1.3rem; font-weight: bold;">Consumer # {state.consumer.consumerNumber} </h7><br />
                    <table class="m-t-10 no-border-table">
                      <tbody>
                        <tr>
                          <td>Connection Status</td>
                          <td class="uppercase">{state.consumer.connectionStatus}</td>
                        </tr>
                        <tr>
                          <td>Connection Type</td>
                          <td class="uppercase">{state.consumer.connectionType}</td>
                        </tr>
                        <tr>
                          <td>Meter Number</td>
                          <td>{state.consumer.meterNumber}</td>
                        </tr>
                        <tr>
                          <td>Meter Status</td>
                          <td>{state.consumer.meterStatus}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
            <div class="box">
              <h7 style="font-size: 1.3rem; font-weight: bold;">Record Current Location </h7><br />
              <div class="row m-t-10">
                <div class="col-xs-6 col-sm-6 col-md-6 col-lg-6 has-text-center">
                  {
                    !state.isShowLocation &&
                    <button style="height: auto;" class="button-small" onClick={this.showLocation.bind(this)} disabled={!Object.keys(state.consumer).length}>
                      <p class="icon icon-map-marker" style="font-size: 35px;"/>
                    </button>
                  }
                  {
                    state.isShowLocation &&
                    <button style="height: auto;" class="button-small" onClick={this.getGeoLocation.bind(this)} disabled={!Object.keys(state.consumer).length}>
                      <p class="icon icon-map-marker" style="font-size: 35px;"/>
                    </button>
                  }
                </div>
                <div class="col-xs-6 col-sm-6 col-md-6 col-lg-6">
                  <div class="row">
                    Latitude:
                    {
                      state.isShowLocation &&
                      (<a style="padding-left: 2px;" class="hyperlink" onClick={this.toggleMapModal.bind(this)}
                        title="Click to open Map">
                        {state.latitude}
                      </a>) || '-'
                    }
                  </div>
                  <div class="row m-t-10">
                    Longitude:
                    {
                      state.isShowLocation &&
                      (<a style="padding-left: 2px;" class="hyperlink" onClick={this.toggleMapModal.bind(this)}
                        title="Click to open Map">
                        {state.longitude}
                      </a>) || '-'
                    }
                  </div>
                </div>
              </div>
            </div>
            <div class="box">
              <h7 style="font-size: 1.3rem; font-weight: bold;">Upload Meter Picture</h7><br />
              <div class="row m-t-10">
                <div class="col-xs-6 col-sm-6 col-md-6 col-lg-6 has-text-center">
                  <em onClick={this.openBrowseMenu.bind(this)} class="icon icon-camera" style="font-size: 3rem;"/>
                </div>
                {
                  state.file &&
                    // <div class="row m-t-10" id="displayFile">
                    //   <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                    //     <object style="float: left; width: 100%; height: 100%;" class="column" data="" id="showFile"/>
                    //   </div>
                    // </div>
                    <div class="col-xs-6 col-sm-6 col-md-6 col-lg-6">
                      <a class="hyperlink">{state.selectedFilePath}</a>
                    </div>
                }
                {
                  state.consumer.signedURL &&
                    <div class="col-xs-6 col-sm-6 col-md-6 col-lg-6">
                      <a class="hyperlink" href={state.consumer.signedURL}>{state.consumer.fileName}</a>
                    </div>
                }
                {
                  (!state.file && !state.consumer.signedURL) &&
                  <div class="col-xs-6 col-sm-6 col-md-6 col-lg-6">
                    <span>No file selected</span>
                  </div>
                }
              </div>
              <div class="row has-text-center">
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                  <button style="width: 6rem; border-radius: 3px;" class="button m-t-10" onClick={this.updateConsumer.bind(this)}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </section>
        {
          state.googleMapModal &&
            <Modal title="Map View" modalSize="is-medium" onClose={this.toggleMapModal.bind(this)}>
              <ModalBody>
                <div class="row">
                  <div class="map">
                    {
                      state.googleMapModal &&
                        <SimpleMap lat={state.latitude} lng={state.longitude} altText="My Location"
                          markerContent={{
                            consumer: state.consumer,
                            budgetCategoryList: state.budgetCategoryList
                          }} />
                    }
                  </div>
                </div>
              </ModalBody>
            </Modal>
        }
        {
          state.locationMessageModal &&
            <Modal title="Location Updated" modalSize="is-medium" onClose={this.toggleLocationMessageModal.bind(this)}>
              <ModalBody>
                <div class="row">
                  <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                    <span>Current location has been recorded. If you want to update new location, please click on
                      <em class="icon icon-map-marker" style="margin-right: 2px; font-size: 16px; vertical-align: middle;"/>
                     icon again.</span>
                  </div>
                </div>
                <div class="row m-t-10">
                  <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 table-responsive">
                    Recorded co-ordinates: <br />
                    <table class="no-border-table">
                      <tbody>
                        <tr>
                          <td>Latitude</td>
                          <td><strong>{state.latitude}</strong></td>
                        </tr>
                        <tr>
                          <td>Longitude</td>
                          <td><strong>{state.longitude}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <br />
                <div class="row m-t-10">
                  <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                    <a onClick={this.toggleMapModal.bind(this)} class="hyperlink"> Click here to view on map</a>
                  </div>
                </div>
              </ModalBody>
            </Modal>
        }
        <input name="file" type="file" id="browse" accept=".jpg,.jpeg,.png" class="hidden" required onChange={this.checkFileSize.bind(this)}
          value={state.file} />
      </div>
    );
  }
}
