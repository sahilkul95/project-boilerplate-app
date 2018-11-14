import { h, Component } from 'preact';
import CONSTANTS from '../../lib/constants';
import http from 'fetch-bb';
import { startLoader, stopLoader, formatDateTime } from '../../lib/utils';
import { AppStore } from '../../lib/store';

export default class ConsumerStatusHistory extends Component {

  getConsumerStatusHistory() {
    this.setState({ loadingHistoryList: true });
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/object/${this.props.consumerID}/history`, {changedAttribute: 'status', objectType: 'consumer'})
      .then((histories) => {
        histories.map((history) => {
          history.userName = this.getUserName(history.createdBy);
        });
        this.setState({histories, loadingHistoryList: false});
        stopLoader();
      }).catch((HTTPException) => {
        this.setState({ loadingHistoryList: false });
        console.error(HTTPException);
        stopLoader();
      });
  }

  getUserName(id) {
    let userName = this.state.userList.filter( (elem) => {
      if (elem._id === id) return elem;
    })[0];
    return userName ? userName.displayName : 'system';
  }

  getConsumerDetails() {
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.consumerID}`)
      .then((consumerDetails) => {
        this.setState({ consumerDetails });
        stopLoader();
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        stopLoader();
      });
  }

  componentWillMount() {
    this.state = {
      histories: [],
      isModalOpen: true,
      isModalButtonLocked: false,
      isClientAdmin: false,
      loadingHistoryList: false,
      consumerDetails: {},
      userList: [],
      displayStatuses: {
        verified: 'Verified',
        companyverificationpending: 'Verification Pending',
        invalid: 'Invalid',
        validationpending: 'Validation Pending',
        rejected: 'Rejected',
        queuedforvalidation: 'Queued For Validation',
        deactivated: 'Deactivated',
        activated: 'Activated',
        delete: 'Deleted'
      }
    };
  }

  getAllUsers() {
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/user`, {noLimit: 'noLimit'})
      .then((users) => {
        this.setState({userList: users});
      });
  }

  componentDidMount() {
    const userInfo = AppStore.get('userinfo');
    this.setState({isClientAdmin: userInfo.isClientAdmin});
    this.getAllUsers()
      .then(() => {
        this.getConsumerStatusHistory()
          .then(() => {
            this.getConsumerDetails();
          });
      });
  }

  render({}, { consumerDetails, displayStatuses, histories }) {
    return (
      <section class="box border-top-color-blue">
        <div class="has-text-center">
          <h6>Consumer History</h6>
        </div>
        <div>
          Active Since: <b>{formatDateTime(consumerDetails.dateOfConnection)}</b>
        </div>
        <table>
          {/*<thead>
            <tr>
              {columns.map((col) => (<th>{col}</th>))}
            </tr>
          </thead>*/}
          <thead>
            {/*T1031- add headers to consumer history table*/}
            <tr>
              <th>Action Taken</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consumer Created in Powerdek<sup style="font-size:8px;">TM</sup></td>
              <td><b>{formatDateTime(consumerDetails.createdAt)}</b></td>
            </tr>
            {
              (histories.map((row) => (
                <tr>
                  <td>Status changed from <i><b>{displayStatuses[row.oldValue]}</b></i> to
                    <i><b> {displayStatuses[row.newValue]}</b></i> by <i><b>{row.userName}</b></i></td>
                  <td>{formatDateTime(row.createdAt, true)}</td>
                </tr>
              )))
            }
            {
              !histories.length && this.state.loadingHistoryList && (
                <span>Loading...</span>
              )
            }
          </tbody>
        </table>
      </section>
    );
  }
}
