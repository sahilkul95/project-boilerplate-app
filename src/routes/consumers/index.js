import { h, Component } from 'preact';
import CONSTANTS from '../../lib/constants';
import { Link, route } from 'preact-router';
import { Modal, ModalBody, ModalFooter } from '../../components/modal';
import Pagination from '../../components/pagination';
import http from 'fetch-bb';
import { startLoader, stopLoader, GetZones } from '../../lib/utils';
import { AppStore } from '../../lib/store';
import linkState from 'linkstate';

export default class Consumers extends Component {
  getDepartmentList() {
    return http.get(`${CONSTANTS.API_URL}/api/company/department`, { status: 'active' })
      .then((department) => {
        this.setState({departmentList: department});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getWardList() {
    return http.get(`${CONSTANTS.API_URL}/api/company/ward`)
      .then((ward) => {
        this.setState({wardList: ward});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getDiscomDivisionList() {
    return http.get(`${CONSTANTS.API_URL}/api/company/discomDivision`)
      .then((discomDivision) => {
        this.setState({discomDivisionList: discomDivision});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
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

  getDiscomList() {
    return http.get(`${CONSTANTS.API_URL}/api/discom`)
      .then((discoms) => {
        this.setState({discomList: discoms});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getStatuswiseCount() {
    let promiseArray = [
      http.get(`${CONSTANTS.API_URL}/api/consumer/count`, {status: 'verified'}),
      http.get(`${CONSTANTS.API_URL}/api/consumer/count`, {status: 'verified', connectionStatus: 'live'}),
      http.get(`${CONSTANTS.API_URL}/api/consumer/count`, {status: 'verified', connectionStatus: ['pd', 'p.d.']}),
      http.get(`${CONSTANTS.API_URL}/api/consumer/count`, {status: 'verified', connectionStatus: 't.d.'})
    ];

    return Promise.all(promiseArray)
      .then(response => {
        this.setState({
          statuswisecount: {
            totalConsumer: response[0].count,
            liveConsumer: response[1].count,
            pdCosnumer: response[2].count,
            tdConsumer: response[3].count
          }
        });
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getDiscomNameUsingId(discomID) {
    let discom = this.state.discomList.filter( (elem) => {
      if (elem._id === discomID) return elem;
    })[0];
    return discom ? discom.shortName : '-';
  }

  getDiscomDivisionNumberUsingId(discomDivisionID) {
    let discomDivision = this.state.discomDivisionList.filter( (elem) => {
      if (elem._id === discomDivisionID) return elem;
    })[0];
    return discomDivision ? discomDivision.number : '-';
  }

  getBudgetCategoryNameUsingId(budgetCategoryID) {
    let budgetCategory = this.state.budgetCategoryList.filter( (elem) => {
      if (elem._id === budgetCategoryID) return elem;
    })[0];
    return budgetCategory ? ( budgetCategory.code ? budgetCategory.code + ' - ' + budgetCategory.displayName  : budgetCategory.displayName ) : '-';
  }

  getWardNameUsingId(wardID) {
    let ward = this.state.wardList.filter( (elem) => {
      if (elem._id === wardID) return elem;
    })[0];
    return ward ? ward.displayName : '-';
  }

  getZoneNameUsingId(zoneID) {
    let zone = this.state.zoneList.filter( (elem) => {
      if (elem._id === zoneID) return elem;
    })[0];
    return zone ? zone.displayName : '-';
  }

  getConsumerCount() {
    const params = this.getSearchParams();
    delete params.pageNo;
    if (!params.status) params.status = 'verified';
    return http.get(`${CONSTANTS.API_URL}/api/consumer/count`, params)
      .then((consumerCount) => {
        this.setState({totalPages: consumerCount.count});
        this.setState({totalPages: consumerCount.count});
        let totalPagesCount = Math.ceil(this.state.totalPages/10);
        if (totalPagesCount === 0) totalPagesCount = 1;
        if (totalPagesCount < this.state.currentPageNo) {
          this.setState({isTotalPagesCount : true, totalPages: totalPagesCount});
          this.redirectToPreviousPage(totalPagesCount);
        }
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getConsumersList() {
    this.setState({
      loadingConsumerList: true
    });
    startLoader();
    const params = this.getSearchParams();
    if (!params.pageNo) params.pageNo = 1;
    if (!params.status) params.status = 'verified';
    // params.pageNo = pageNo || 1;
    return http.get(`${CONSTANTS.API_URL}/api/consumer`, params)
      .then((consumers) => {
        this.setState({
          currentPageNo: params.pageNo,
          consumerList: consumers,
          loadingConsumerList: false
        });
        if ( !consumers.length && this.state.totalPages > 1 ) {
          let pageCount = params.pageNo - 1;
          if (pageCount === 0) pageCount = 1;
          if (this.state.isTotalPagesCount) {
            this.state.isTotalPagesCount = false;
            pageCount = this.state.totalPages;
          }
          this.redirectToPreviousPage(pageCount);
          return;
        }
        // stopLoader();
      })
      .catch((HTTPException) => {
        this.setState({
          loadingConsumerList: false
        });
        console.error(HTTPException);
        stopLoader();
      });
  }

  redirectToPreviousPage(pageCount) {
    startLoader();
    this.setState({currentPageNo: pageCount});
    let params = this.getSearchParams();
    this.setSelectedFilterParams(params);
  }

  getSearchParams() {
    let params = {};
    if (this.state.currentPageNo) {
      if (this.state.currentPageNo <= 0 || (!Number(this.state.currentPageNo))) {
        this.state.currentPageNo = 1;
      }
      params['pageNo'] = this.state.currentPageNo;
    } else {
      this.state.currentPageNo = 1;
      params['pageNo'] = this.state.currentPageNo;
    }

    if (this.state.connectionStatus) {
      params['connectionStatus'] = this.state.connectionStatus;
    }
    if (this.state.departmentID) {
      params['departmentID'] = this.state.departmentID;
    }

    if (this.state.discomDivisionID) {
      params['discomDivisionID'] = this.state.discomDivisionID;
    }

    if (this.state.connectionStatus) {
      params['connectionStatus'] = this.state.connectionStatus;
    }

    if (this.state.status) {
      params['status'] = this.state.status;
    }

    if (this.state.wardID) {
      params['wardID'] = this.state.wardID;
    }

    if (this.state.zoneID) {
      params['zoneID'] = this.state.zoneID;
    }

    if (this.state.budgetCategoryID) {
      params['budgetCategoryID'] = this.state.budgetCategoryID;
    }

    if (this.state.connectionType) {
      params['connectionType'] = this.state.connectionType;
    }

    if (this.state.consumerNumber) {
      params['consumerNumber'] = this.state.consumerNumber;
    }
    this.setState({filterCount: (Object.keys(params)).length});
    return params;
  }

  toggleFilter() {
    this.resetSearchConsumerFilter();
    this.setParamsToState(this.props.matches);
    this.setState({isFilterOpen: !this.state.isFilterOpen});
  }

  search(e) {
    e.preventDefault();
    this.setState({currentPageNo: 1});

    let url = location.pathname + '?pageNo=' + this.state.currentPageNo;

    if (e.target.department.value) {
      this.setState({departmentID: e.target.department.value});
      url = url + '&departmentID=' + e.target.department.value;
    } else {
      this.setState({departmentID: ''});
    }
    if (e.target.discomDivision.value) {
      this.setState({discomDivisionID: e.target.discomDivision.value});
      url = url + '&discomDivisionID=' + e.target.discomDivision.value ;
    } else {
      this.setState({discomDivisionID: ''});
    }
    if (e.target.status.value) {
      this.setState({status: e.target.status.value});
      url = url + '&status=' + e.target.status.value ;
    } else {
      this.setState({status: ''});
    }
    if (e.target.ward && e.target.ward.value) {
      this.setState({wardID: e.target.ward.value});
      url = url + '&wardID=' + e.target.ward.value ;
    } else {
      this.setState({wardID: ''});
    }

    if (e.target.zone && e.target.zone.value) {
      this.setState({zoneID: e.target.zone.value});
      url = url + '&zoneID=' + e.target.zone.value ;
    } else {
      this.setState({zoneID: ''});
    }

    if (e.target.budgetCategory.value) {
      this.setState({budgetCategoryID: e.target.budgetCategory.value});
      url = url + '&budgetCategoryID=' + e.target.budgetCategory.value ;
    } else {
      this.setState({budgetCategoryID: ''});
    }

    if (e.target.connectionType.value) {
      this.setState({connectionType: e.target.connectionType.value});
      url = url + '&connectionType=' + e.target.connectionType.value ;
    } else {
      this.setState({connectionType: ''});
    }
    route(url);
    this.toggleFilter();
  }

  searchConsumer(e) {
    e.preventDefault();
    this.setState({currentPageNo: 1, consumerNumber: e.target.consumerNumber.value});
    let params = this.getSearchParams();
    this.setSelectedFilterParams(params);
  }

  onTabClick(status) {
    this.setState({currentPageNo: 1});
    let params = this.getSearchParams();
    let url = '/consumers/' + status + '?pageNo=' + this.state.currentPageNo;
    this.setParams(url, params);
  }

  setSelectedFilterParams(params) {
    let url = location.pathname + '?pageNo=' + this.state.currentPageNo;

    this.setParams(url, params);
  }

  setParams(url, params) {
    if (params.departmentID) {
      this.setState({departmentID: params.departmentID});
      url = url + '&departmentID=' + params.departmentID;
    } else {
      this.setState({departmentID: ''});
    }
    if (params.discomDivisionID) {
      this.setState({discomDivisionID: params.discomDivisionID});
      url = url + '&discomDivisionID=' + params.discomDivisionID ;
    } else {
      this.setState({discomDivisionID: ''});
    }
    if (params.status) {
      this.setState({status: params.status});
      url = url + '&status=' + params.status ;
    } else {
      this.setState({status: ''});
    }
    if (params.wardID) {
      this.setState({wardID: params.wardID});
      url = url + '&wardID=' + params.wardID ;
    } else {
      this.setState({wardID: ''});
    }

    if (params.zoneID) {
      this.setState({zoneID: params.zoneID});
      url = url + '&zoneID=' + params.zoneID ;
    } else {
      this.setState({zoneID: ''});
    }

    if (params.budgetCategoryID) {
      this.setState({budgetCategoryID: params.budgetCategoryID});
      url = url + '&budgetCategoryID=' + params.budgetCategoryID ;
    } else {
      this.setState({budgetCategoryID: ''});
    }

    if (params.connectionType) {
      this.setState({connectionType: params.connectionType});
      url = url + '&connectionType=' + params.connectionType ;
    } else {
      this.setState({connectionType: ''});
    }

    if (params.consumerNumber) {
      this.setState({consumerNumber: params.consumerNumber});
      url = url + '&consumerNumber=' + params.consumerNumber;
    } else {
      this.setState({consumerNumber: ''});
    }

    route(url);
  }

  selectConnectionType(e) {
    this.setState({connectionType: e.target.value});
    let params = this.getSearchParams();
    this.setSelectedFilterParams(params);
  }

  selectBillingUnit(e) {
    this.setState({discomDivisionID: e.target.value});
    let params = this.getSearchParams();
    this.setSelectedFilterParams(params);
  }

  selectBudgetCategory(e) {
    this.setState({budgetCategoryID: e.target.value});
    let params = this.getSearchParams();
    this.setSelectedFilterParams(params);
  }

  isResetButton() {
    return !(this.state.consumerNumber || this.state.connectionType || this.state.discomDivisionID || this.state.budgetCategoryID);
  }

  resetSearchConsumer() {
    this.setState({
      currentPageNo: 1,
      consumerNumber: '',
      departmentID: '',
      discomDivisionID: '',
      connectionStatus: '',
      status: '',
      wardID: '',
      zoneID: '',
      budgetCategoryID: '',
      connectionType: ''
    });

    let url = location.pathname + '?pageNo=' + this.state.currentPageNo;
    route(url);
  }

  resetSearchConsumerFilter() {
    this.setState({
      currentPageNo: 1,
      consumerNumber: '',
      departmentID: '',
      discomDivisionID: '',
      status: '',
      wardID: '',
      zoneID: '',
      budgetCategoryID: '',
      connectionType: ''
    });
  }

  setParamsToState(params) {
    if (params.pageNo) {
      this.state.currentPageNo = Number(params.pageNo);
      if (this.state.currentPageNo <= 0 || (!Number(this.state.currentPageNo))) {
        this.state.currentPageNo = 1;
      }
    }
    if (this.props.matches.connectionStatus) {
      this.state.connectionStatus = this.props.matches.connectionStatus;
    }
    if (params.departmentID) {
      this.state.departmentID = params.departmentID;
    }

    if (params.discomDivisionID) {
      this.state.discomDivisionID = params.discomDivisionID;
    }

    if (params.status) {
      this.state.status = params.status;
    }

    if (params.wardID) {
      this.state.wardID = params.wardID;
    }

    if (params.zoneID) {
      this.state.zoneID = params.zoneID;
    }

    if (params.budgetCategoryID) {
      this.state.budgetCategoryID = params.budgetCategoryID;
    }

    if (params.connectionType) {
      this.state.connectionType = params.connectionType;
    }
    if (params.consumerNumber) {
      this.state.consumerNumber = params.consumerNumber;
    }
  }

  onChangePageClick(pageNo) {
    this.setState({currentPageNo: pageNo});
    let params = this.getSearchParams();
    this.setSelectedFilterParams(params);
  }

  componentWillMount() {
    this.state = {
      consumerList: [],
      totalPages: 0,
      budgetCategoryList: [],
      discomList: [],
      departmentList: [],
      wardList: [],
      zoneList: [],
      discomDivisionList: [],
      currentPageNo: 1,
      statuswisecount: {
        totalConsumer: 0,
        tdConsumer: 0,
        pdCosnumer: 0,
        liveConsumer: 0
      },
      isFilterOpen: false,
      filterCount: 0,
      statuses: {
        validationpending: 'Validation Pending',
        queued: 'Queued',
        companyverificationpending: 'Verification Pending',
        invalid: 'Invalid',
        verified: 'Verified',
        rejected: 'Rejected'
      },
      status: '',
      connectionStatus: this.props.matches.connectionStatus,
      organizationCreationMethod: AppStore.get('userinfo').company.metadata.organizationCreationMethod,
      loadingConsumerList: false
    };
  }
  componentDidMount() {
    this.setParamsToState(this.props.matches);
    let promiseArray = [];
    promiseArray.push(this.getStatuswiseCount());
    promiseArray.push(this.getConsumerCount());

    promiseArray.push(this.getDiscomList());
    promiseArray.push(this.getDepartmentList());
    promiseArray.push(GetZones().then((zones) => this.setState({zoneList: zones})));
    promiseArray.push(this.getWardList());
    promiseArray.push(this.getDiscomDivisionList());
    promiseArray.push(this.getBudgetCategoryList());
    promiseArray.push(this.getConsumersList());
    startLoader();
    return Promise.all(promiseArray)
      .then(() => {
        stopLoader();
      });
  }

  componentWillReceiveProps(props) {
    this.setParamsToState(props);
    let promise = [this.getConsumerCount(), this.getConsumersList()];
    startLoader();
    return Promise.all(promise)
      .then(() => {
        stopLoader();
      });
  }

  render({ }, { consumerList, isFilterOpen }) {
    return (
      <div>
        <div class="box">
          <form name="searchConsumerForm" class="row" onSubmit={this.searchConsumer.bind(this)}>
            <div class="search-box col-xs-9 col-sm-10 col-md-5 col-lg-4">
              <em class="icon icon-search" />
              <input type="text" placeholder="Enter Consumer No." name="consumerNumber" value={this.state.consumerNumber || ''}/>
            </div>
            <div class="col-xs-3 col-sm-2 col-md-7 col-lg-8">
              <button type="button" style="height: 2rem; float: right;" class="button button-small" title="Advanced Filter"
                onClick={this.toggleFilter.bind(this)}>
                <em class="icon icon-filter filter" />
              </button>
            </div>
          </form>
        </div>
        <div class="box">
          <div>
            <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
              <h7>Total Consumers : <b>{this.state.totalPages}</b></h7>
            </div>
          </div>
        </div>

        <section class="column no-padding" style="width: 100%;">
          <div class="box">
            <div class={`table-responsive`}>
              <table>
                <thead>
                  <tr>
                    <th>Consumer Number</th>
                    <th>Billing Unit</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    (consumerList.map((row) => (
                      <tr>
                        <td>{row.consumerNumber}
                          {
                            (row.connectionStatus === 'pd' || row.connectionStatus === 'p.d.') && (
                              <span class="tag is-danger is-small-tag">PD</span>
                            )
                          }
                          {
                            (row.protestFlag && row.protestFlag === 'protested') && (
                              <span class="tag is-warning is-small-tag">D</span>
                            )
                          }
                        </td>
                        <td>{this.getDiscomDivisionNumberUsingId(row.discomDivisionID)}</td>
                        <td style="text-align: center"><Link  href={`/consumer/${row._id}`} >
                          <i class="icon icon-pencil-square-o" style="font-size: 20px; color: #333;"/></Link>
                        </td>
                      </tr>
                    )))
                  }
                  {
                    !consumerList.length && this.state.loadingConsumerList && (
                      <span>Loading...</span>
                    )
                  }
                  {
                    !consumerList.length && !this.state.loadingConsumerList && (
                      <span>No Data Found</span>
                    )
                  }
                </tbody>
              </table>
            </div>
            <div class="has-text-right column no-padding pagination">
              <Pagination count={this.state.totalPages} currentPageNo={this.state.currentPageNo} onChangePageClick={this.onChangePageClick.bind(this)} />
            </div>
          </div>
        </section>
        {
          isFilterOpen && (
            <Modal title="Filter Consumers" modalSize="is-medium" onClose={this.toggleFilter.bind(this)}>
              <form name="searchForm" onSubmit={this.search.bind(this)}>
                <ModalBody>
                  <div class="row">
                    <div class="column column-50">
                      <div class="select">
                        <select name='department' className={this.state.departmentID ? 'active-option' : ''} onInput={linkState(this, 'departmentID')}>
                          <option value=''>Select Department</option>
                          {
                            this.state.departmentList.map((list) =>
                              ( <option value={list._id} selected= {this.state.departmentID === list._id}>{list.displayName}</option>))
                          }
                        </select>
                      </div>
                      <div class="select">
                        <select name='budgetCategory' className={this.state.budgetCategoryID ? 'active-option' : ''}
                          onInput={linkState(this, 'budgetCategoryID')}>
                          <option value='' selected>Select Budget Category</option>
                          {
                            this.state.budgetCategoryList.map((list) =>
                              ! list.deletedAt && ( <option value={list._id} selected= {this.state.budgetCategoryID === list._id}>
                                {(list.code ? (list.code + ' - ' + list.displayName) : list.displayName)}</option>))
                          }
                        </select>
                      </div>
                      <div class="select">
                        <select name='status'className={this.state.status ? 'active-option' : ''} onInput={linkState(this, 'status')}>
                          <option value='' selected>Select Status</option>
                          <option value='companyverificationpending' selected= {this.state.status === 'companyverificationpending'}>
                            Verification Pending</option>
                          <option value='verified' selected= {this.state.status === 'verified'}>Verified</option>
                          <option value='rejected' selected= {this.state.status === 'rejected'}>Rejected</option>
                          <option value='invalid' selected= {this.state.status === 'invalid'}>Invalid</option>
                          <option value='deactivated' selected= {this.state.status === 'deactivated'}>Deactivated</option>
                        </select>
                      </div>
                      {/*
                        <div class="column column-50 select">
                          <select name='connectionStatus' className={this.state.connectionStatus ? 'active-option' : ''}>
                            <option value='' selected>Select Connection Status</option>
                            <option value='live' selected= {this.state.connectionStatus === 'live'}>LIVE</option>
                            <option value='pd' selected= {this.state.connectionStatus === 'pd'}>PD</option>
                            <option value='t.d.' selected= {this.state.connectionStatus === 't.d.'}>T.D.</option>
                          </select>
                        </div>
                      */}
                    </div>
                    <div class="column column-50">
                      <div class="select">
                        <select name='connectionType' className={this.state.connectionType ? 'active-option' : ''}
                          onInput={linkState(this, 'connectionType')}>
                          <option value='' selected>Select Connection Type</option>
                          <option value='lt' selected= {this.state.connectionType === 'lt'}>LT</option>
                          <option value='ht' selected= {this.state.connectionType === 'ht'}>HT</option>
                        </select>
                      </div>
                      <div class="select">
                        <select name='discomDivision' className={this.state.discomDivisionID ? 'active-option' : ''}
                          onInput={linkState(this, 'discomDivisionID')}>
                          <option value='' selected>Select Billing Unit</option>
                          {
                            this.state.discomDivisionList.map((list) =>
                              ( <option value={list._id} selected= {this.state.discomDivisionID === list._id}>{list.number} - {list.name}</option>))
                          }
                        </select>
                      </div>
                      <div class="select">
                        <select name='ward' className={this.state.wardID ? 'active-option' : ''} onInput={linkState(this, 'wardID')}>
                          <option value='' selected>Select Ward</option>
                          {
                            this.state.wardList.map((list) =>
                              !list.deletedAt && ( <option value={list._id} selected= {this.state.wardID === list._id}>{list.displayName}</option>))
                          }
                        </select>
                      </div>
                      <div class="select">
                        <select name='zone' className={this.state.zoneID ? 'active-option' : ''} onInput={linkState(this, 'zoneID')}>
                          <option value='' selected>Select Zone</option>
                          {
                            this.state.zoneList.map((list) =>
                              !list.deletedAt && ( <option value={list._id} selected= {this.state.zoneID === list._id}>{list.displayName}</option>))
                          }
                        </select>
                      </div>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button type="reset" onClick={this.resetSearchConsumerFilter.bind(this)} class="button-clear button-small">Reset</button>
                  <button type="submit" class="button button-small">Search</button>
                </ModalFooter>
              </form>
            </Modal>
          )
        }
      </div>
    );
  }
}
