import { h, Component } from 'preact';
import CONSTANTS from '../../lib/constants';
// import { Toast } from '../../lib/toastr';
import { AppStore } from '../../lib/store';
import http from 'fetch-bb';
import { formatDateTime, startLoader, stopLoader, getFormattedAmount } from '../../lib/utils';

export default class BillHistory extends Component {
  componentWillMount() {
    this.state = {
      userList: [],
      billStatusHistory: [],
      billDetails: {},
      loadingHistoryList: false,
      statuses: {
        reviewpending: 'Review Pending',
        paidoutsidebillwise: 'Paid Outside Powerdek',
        unpaid: 'Do Not Pay',
        paybill: 'Pay Bill',
        paid: 'Bill Paid',
        tobefetched: 'To be Fetched',
        tobemapped: 'To be Mapped',
        failed: 'Failed',
        success: 'Success',
        tobeprotested: 'To be Protested',
        donotprotest: 'Do Not Protest',
        protested: 'Protested',
        resolved: 'Resolved'
      },
      billFormDisplayName: AppStore.get('userinfo').company.billFormDisplayName
    };
  }

  getUserName(id) {
    let userName = this.state.userList.filter( (elem) => {
      if (elem._id === id) return elem;
    })[0];
    return userName ? userName.displayName : '';
  }

  getBillStatusHistory() {
    this.setState({ loadingHistoryList: true });
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/object/${this.props.billID}/history`, {objectType: 'bill',
      changedAttribute: ['status', 'billFormID', 'protestFlag', 'amountTobePaid']})
      .then((billStatusHistory) => {
        billStatusHistory.map((history) => {
          history.userName = this.getUserName(history.createdBy);
        });
        this.setState({billStatusHistory, loadingHistoryList: false});
        stopLoader();
      })
      .catch((HTTPException) => {
        this.setState({loadingHistoryList: false});
        stopLoader();
        console.error(HTTPException.message);
      });
  }

  componentDidMount() {
    startLoader();
    http.get(`${CONSTANTS.API_URL}/api/user`, {noLimit: 'noLimit'})
      .then((users) => {
        stopLoader();
        this.setState({userList: users});
        this.getBillStatusHistory();
      });
  }

  render(props, { billStatusHistory, statuses, billFormDisplayName }) {
    return (
      <section class="box border-top-color-blue">
        <div class="column has-text-center">
          <h6>Bill History</h6>
        </div>
        <table>
          <thead>
            <tr>
              <th>Action Taken</th>
              <th>Date & Time</th>
              <th>Comment (if any)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bill created in Powerdek<sup style="font-size:8px;">TM</sup>: </td>
              <td><b>{formatDateTime(props.createdAt)}</b></td>
              <td>-</td>
            </tr>
            {
              (billStatusHistory.map((row) => (
                <tr>
                  <td>
                    {
                      ((row.changedAttribute === 'billFormID') && row.newValue) &&
                      <span>Bill added in {billFormDisplayName}</span>
                    }
                    {
                      ((row.changedAttribute === 'billFormID') && !row.newValue) &&
                      <span>Bill removed from {billFormDisplayName}</span>
                    }
                    {
                      row.changedAttribute !== 'billFormID' && row.changedAttribute !== 'amountTobePaid' &&
                      <span>
                      Status changed {(row.oldValue && row.oldValue !== 'unreviewed') && 'from'} <i><b>{statuses[row.oldValue]}</b></i> to
                        <i><b> {statuses[row.newValue]}</b></i>
                        {
                          row.userName !== '' &&
                          <span> by <i><b>{row.userName}</b></i></span>
                        }
                      </span>
                    }
                    {
                      row.changedAttribute === 'amountTobePaid' &&
                      <span>Amount to be paid changed from
                        <i><b>{getFormattedAmount(row.oldValue)}</b></i> to <i><b>{getFormattedAmount(row.newValue)}</b></i> by <i>
                          <b>{row.userName}</b></i></span>
                    }
                  </td>
                  <td>{formatDateTime(row.createdAt, true)}</td>
                  <td>{row.comment || '-'}</td>
                </tr>
              )))
            }
            {
              !billStatusHistory.length && this.state.loadingHistoryList && (
                <span>Loading...</span>
              )
            }
          </tbody>
        </table>
      </section>
    );
  }
}
