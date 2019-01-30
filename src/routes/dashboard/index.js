import { h, Component } from 'preact';
import { AppStore } from '../../lib/store';
import CONSTANTS from '../../lib/constants';
import { route } from 'preact-router';
import { startLoader, stopLoader } from '../../lib/utils';
import http from 'fetch-bb';
import { Toast } from '../../lib/toastr';

export default class Dashboard extends Component {

  redirect(link) {
    route('/'+link);
  }

  searchConsumer(e) {
    e.preventDefault();
    let url= '';
    return http.get(`${CONSTANTS.API_URL}/api/consumer`, {consumerNumber: e.target.consumerNumber.value})
      .then((consumers) => {
        if (!consumers.length) {
          return new Toast('No consumers found.', Toast.TYPE_ERROR, Toast.TIME_NORMAL);
        }
        url = '/consumers?consumerNumber=' + e.target.consumerNumber.value;
        route(url);
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_NORMAL);
        console.error(HTTPException);
      });
  }

  getUnderReviewTaskCount() {
    let params = {
      taskObject: '',
      status: 'underreview',
      assignedUserID: this.state.loggedUserID
    };

    if (this.state.departmentFlag) {
      params.taskObject = 'paymentVoucher';
    } else {
      params.taskObject = 'all';
    }

    return http.get(`${CONSTANTS.API_URL}/api/task/count`, params)
      .then((response) => {
        // this.state.totalTabCount.requestedActionsTabCount += response.count;
        this.setState({
          underReviewTaskCount : response.count
        });
      });
  }

  getRejectedTaskCount() {
    let params = {
      taskObject: '',
      status: 'rejected',
      assignedUserID: this.state.loggedUserID
    };

    if (this.state.departmentFlag) {
      params.taskObject = 'paymentVoucher';
    } else {
      params.taskObject = 'all';
    }

    return http.get(`${CONSTANTS.API_URL}/api/task/count`, params)
      .then((response) => {
        // this.state.totalTabCount.requestedActionsTabCount += response.count;
        this.setState({
          rejectedTaskCount : response.count
        });
      });
  }

  getApprovedBillFormTasks() {
    let params = {
      taskObject: 'billForm',
      status: 'accepted'
    };
    return http.get(`${CONSTANTS.API_URL}/api/task/count`, params)
      .then((response) => {
        if (this.state.userInfo.company.metadata.approvedBillformVisibilityMode === 'owndepartment' && response.count > 0) {
          this.setState({isOwnDepartment: true});
        }
        if (this.state.userInfo.company.metadata.approvedBillformVisibilityMode === 'otherdepartment' && response.count > 0) {
          this.state.userInfo.department.filter((value) => {
            if (value._id === this.state.userInfo.company.metadata.nextDepartmentAfterBillformTaskApproval) {
              this.setState({departmentFlag: true});
            }
          });
        }
        // if (this.state.departmentFlag || this.state.isOwnDepartment) {
        //   this.state.totalTabCount.requestedActionsTabCount += response.count;
        // }
        this.setState({
          approvedBillformTasksCount : response.count
        });
      });
  }

  getConsumerCount() {
    let params = {
      status: 'verified'
    };
    return http.get(`${CONSTANTS.API_URL}/api/consumer/count`, params)
      .then((response) => {
        // this.state.totalTabCount.requestedActionsTabCount += response.count;
        this.setState({
          consumerCount : response.count
        });
      });
  }

  componentWillMount() {
    this.state = {
      consumerNumber: '',
      approvedBillformTasksCount: 0,
      underReviewTaskCount: 0,
      rejectedTaskCount: 0,
      consumerCount: 0,
      // userInfo: AppStore.get('userinfo'),
      loggedUserID: ''
    };
    // this.setState({loggedUserID: this.state.userInfo.id});
  }

  componentDidMount() {
    // let promises = [
    //   this.getRejectedTaskCount(),
    //   this.getUnderReviewTaskCount(),
    //   this.getApprovedBillFormTasks(),
    //   this.getConsumerCount()
    // ];
    // startLoader();
    // return Promise.all(promises)
    //   .then(() => {
    //     stopLoader();
    //   })
    //   .catch((HTTPException) => {
    //     console.error(HTTPException);
    //   });
  }

  render({}, state) {
    return (
      <div>
        <div class="box" style="margin-bottom:20px !important">
          <form name="searchConsumerForm" class="row" onSubmit={this.searchConsumer.bind(this)}>
            <div class="search-box col-xs-12 col-sm-12 col-md-12 col-lg-12 no-padding">
              <em class="icon icon-search" />
              <input type="text" placeholder="Enter Consumer No." name="consumerNumber" value={state.consumerNumber || ''}/>
            </div>
          </form>
        </div>
        <div class="row dashboard-consumer-tile">
          <div class="col-xs-12 col-sm-6 col-md-6 col-lg-3">
            <div class="box">
              <div class="row">
                <div class="col-xs-6 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <span>{state.userInfo.company.shortName.toUpperCase()} MSEDCL<br/>Consumers</span>
                </div>
                <div class="col-xs-6 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <h6 class="pointer" onClick={this.redirect.bind(this, 'consumers')}>{state.consumerCount}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row dashboard-label">
          <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
            <label>Requests</label>
          </div>
        </div>
        <div class="row dashboard-task-tile">
          <div class="col-xs-6 col-sm-6 col-md-6 col-lg-3">
            <div class="box">
              <div class="row">
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <span>Review</span>
                </div>
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <h6 class="pointer" onClick={this.redirect.bind(this, 'tasks/all/underreview')}>{state.underReviewTaskCount}</h6>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xs-6 col-sm-6 col-md-6 col-lg-3">
            <div class="box" style="margin: 0 20px 10px 0 !important;">
              <div class="row">
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <span>Rejected</span>
                </div>
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <h6 class="pointer" onClick={this.redirect.bind(this, 'tasks/all/rejected')}>{state.rejectedTaskCount}</h6>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xs-6 col-sm-6 col-md-6 col-lg-3">
            <div class="box">
              <div class="row">
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <span>Vouchers</span>
                </div>
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-center">
                  <h6 class="pointer" onClick={this.redirect.bind(this, 'tasks/billForm/accepted')}>{state.approvedBillformTasksCount}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
