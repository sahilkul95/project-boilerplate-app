import { h, Component } from 'preact';
import { Link } from 'preact-router';
import CONSTANTS from '../../lib/constants';
import { Toast } from '../../lib/toastr';
import { Modal, ModalBody, ModalFooter } from '../../components/modal';
import Pagination from '../../components/pagination';
import linkState from 'linkstate';
import http from 'fetch-bb';
import { formatDateTime, startLoader, stopLoader } from '../../lib/utils';
import { AppStore } from '../../lib/store';
import { route } from 'preact-router';

export default class TaskList extends Component {
  componentWillMount() {
    this.state = {
      totalPages: 0,
      currentPageNo: 1,
      isSubmitForReviewModalOpen: false,
      showQuorumFullMessageModal: false,
      selectedDepartmentID: '',
      taskList: [],
      idOfTaskToApprove: '',
      department: '',
      reviewer: '',
      comment: '',
      objectType: '',
      status: '',
      taskHistoryModal: false,
      histories: [],
      taskOwnerName: '',
      responsibleParty: '',
      userList: [],
      allUsers: [],
      statuses: {
        underreview: 'Under Review',
        approved: 'Approved',
        rejected: 'Rejected',
        accepted: 'Accepted'
      },
      historyStatuses: {
        underreview: 'Submitted for review',
        approved: 'Approved',
        rejected: 'Rejected',
        accepted: 'Approved'
      },
      loggedUserID: '',
      isViewHistory: false,
      isRequestChanges: false,
      isChangeReviewer: false,
      idOfTaskToChangeReviewer: '',
      submitModalTitle: 'Submit for Review',
      billFormVisibilityMode: '',
      paymentVoucherNumber: '',
      amount: '',
      date: '',
      paymentInstrumentDate:'',
      paymentVoucherFile: '',
      paymentInstrumentFile: '',
      isOfflinePaymentVoucherModal: false,
      paymentMode: '',
      paymentModeNumber: '',
      isButtonLocked: false,
      selectedBillForm: {},
      loadingTaskList: false,
      isPaymentModeSelected: false,
      loadingTaskHistoryList: false,
      isRejectButtonLocked: false,
      isApproveButtonLocked: false,
      isSubmitButtonLocked: false,
      loggedUserDepartmentIDs: [],
      userInfo: AppStore.get('userinfo'),
      acceptanceCount: 0,
      quorum: 0,
      markAsPaid: '',
      receiptFile: null,
      receiptNumber: '',
      idOfBillFormToPay: '',
      paymentType: '',
      actualAmountPaid: '',
      isEnableReviewerDropdown: false
    };
    const userInfo = AppStore.get('userinfo');
    let deptIDArray = userInfo.department;
    deptIDArray.length && deptIDArray.map((dept) => {
      this.setState({loggedUserDepartmentIDs: this.state.loggedUserDepartmentIDs.concat(dept._id)});
    });
    this.setState({loggedUserID: userInfo.id, objectType: this.props.matches.taskObjectType, status: this.props.matches.status,
      billFormVisibilityMode: userInfo.company.metadata.approvedBillformVisibilityMode,
      isPaymentVoucherCreationRequired: userInfo.company.metadata.isPaymentVoucherCreationRequired,
      /*
      T1498: Display Name for bill form
      Developer: Samruddhi
      Date: 17/7/2018
      */
      billFormDisplayName: userInfo.company.billFormDisplayName,
      displayName: {billForm:userInfo.company.billFormDisplayName , paymentVoucher: 'Payment Voucher'},
      nextDepartmentAfterBillformTaskApproval: userInfo.company.metadata.nextDepartmentAfterBillformTaskApproval
    });
  }

  getFormattedAmount(amount) {
    if (amount) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    }
    return '-';
  }

  getDepartmentList() {
    http.get(`${CONSTANTS.API_URL}/api/company/department`, { status: 'active' })
      .then((department) => {
        this.setState({departmentList: department, selectedDepartmentID: department[0]._id});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }
  getUserList() {
    return http.get(`${CONSTANTS.API_URL}/api/user`,{departmentID: this.state.selectedDepartmentID, noLimit: 'noLimit'})
      .then((users) => {
        /* T1441 : Reviewers list is filtered to display only active users in the dropdown
           Developer : Pallavi
           Date : 05/07/2018
        */
        let activeUsersList = users.filter((user) => {
          return !user.deletedAt;
        });
        this.setState({userList: activeUsersList});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  toggleSubmitForFurtherReview(row) {
    if (row) {
      this.setState({idOfTaskToApprove: row._id, idOfObjectToSubmit: row.taskObjectID, currentStatus: row.status, quorum: row.quorum,
        objectType: row.taskObject, acceptanceCount: row.acceptanceCount});
    }
    this.setState({showQuorumFullMessageModal: !this.state.showQuorumFullMessageModal});
    if (!this.state.showQuorumFullMessageModal) {
      this.setState({isApproveButtonLocked: false});
    }
  }

  toggleSubmitForReview(row) {
    this.setState({showQuorumFullMessageModal: false, idOfObjectToSubmit: row.taskObjectID, currentStatus: row.status, idOfTaskToApprove: row._id,
      acceptanceCount: row.acceptanceCount, quorum: row.quorum});
    this.setState({isSubmitForReviewModalOpen: !this.state.isSubmitForReviewModalOpen, objectType: row.taskObject, isEnableReviewerDropdown: false});
  }

  toggleReview() {
    // T1583 - Response of reviewer is taking too long time on submit for review modal
    // Developer - Shrutika Khot
    // Date - 02/08/18
    // Comment - isEnableReviewerDropdown flag changed to false
    this.setState({isSubmitForReviewModalOpen: !this.state.isSubmitForReviewModalOpen,
      showQuorumFullMessageModal: false, isSubmitButtonLocked: false, isEnableReviewerDropdown: false});
    this.setState({reviewer: '', department: '', comment: '', isChangeReviewer: false, submitModalTitle: 'Submit for Review'});
    if (!this.state.isSubmitForReviewModalOpen) {
      this.setState({isApproveButtonLocked: false});
    }
  }

  approveBillForm(e) {
    e.preventDefault();
    let confirmMsg = confirm('Are you sure you want to approve this '+this.state.displayName[this.state.objectType]+' ?');
    if (confirmMsg) {
      startLoader();
      this.setState({isApproveButtonLocked: true});
      http.put(`${CONSTANTS.API_URL}/api/task/${this.state.idOfTaskToApprove}/changeStatus`, {decision: 'approved'})
        .then(() => {
          stopLoader();
          if (this.state.objectType === 'billForm' && this.state.billFormVisibilityMode === 'otherdepartment') {
            new Toast(this.state.displayName[this.state.objectType]+ ' approved & sent to next department successfully',
              Toast.TYPE_DONE, Toast.TIME_LONG);
          } else {
            new Toast(this.state.displayName[this.state.objectType]+ ' approved successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          }
          this.setState({showQuorumFullMessageModal: false, isApproveButtonLocked: false});
          this.getTaskCount();
          this.getTaskList();
        })
        .catch((HTTPException) => {
          stopLoader();
          this.setState({isApproveButtonLocked: false});
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
          console.error(HTTPException.message);
        });
    }
  }

  loadUsers(e) {
    // T1583 - Response of reviewer is taking too long time on submit for review modal
    // Developer - Shrutika Khot
    // Date - 02/08/18
    // Comment - Cleared userList and reviewer, isEnableReviewerDropdown changed to true
    this.setState({
      selectedDepartmentID: e.target.value,
      userList: [],
      isEnableReviewerDropdown: false,
      reviewer: ''
    });
    this.getUserList().then(() => {
      this.setState({isEnableReviewerDropdown: !this.state.isEnableReviewerDropdown});
    });
  }

  submitForReview(e) {
    e.preventDefault();
    // T1613 - Loader is not working properly when clicked on Submitted for review button.
    // Developer - shrutika Khot
    // date - 13/08/18
    // comment - Added startLoader() and stopLoader()
    startLoader();
    this.setState({isSubmitButtonLocked: true});
    let url;
    let body = {
      departmentID: e.target.department.value,
      userID: e.target.reviewer.value
    };
    if (this.state.isChangeReviewer) {
      url = `${CONSTANTS.API_URL}/api/task/${this.state.idOfTaskToChangeReviewer}/changeReviewer`;
    } else if (this.state.currentStatus === 'rejected' && !this.state.isChangeReviewer) {
      url = `${CONSTANTS.API_URL}/api/object/${this.state.idOfObjectToSubmit}/submitforreview?objectType=${this.state.objectType}`;
      body.status = 'submittedforreview';
    } else {
      url = `${CONSTANTS.API_URL}/api/task/${this.state.idOfTaskToApprove}/changeStatus`;
      body.decision = 'approved';
    }

    if (e.target.comment.value) {
      body.comment = e.target.comment.value;
    }
    http.put(url, body)
      .then(() => {
        if (this.state.isChangeReviewer) {
          new Toast('Reviewer changed successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        } else {
          new Toast(this.state.displayName[this.state.objectType]+' submitted successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        }
        this.toggleReview();
        this.getTaskCount();
        this.getTaskList();
      })
      .catch((HTTPException) => {
        stopLoader();
        this.setState({isSubmitButtonLocked: false});
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  getAllUsers() {
    http.get(`${CONSTANTS.API_URL}/api/user`, {noLimit: 'noLimit'})
      .then((allUsers) => {
        this.setState({allUsers});
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
      });
  }

  getTaskCount() {
    let params = {
      taskObject: this.props.matches.taskObjectType,
      status: this.state.status,
      assignedUserID: this.state.loggedUserID
    };
    if (this.props.matches.taskObjectType === 'billForm' && this.props.matches.status === 'accepted') {
      delete params.assignedUserID;
    }
    return http.get(`${CONSTANTS.API_URL}/api/task/count`, params)
      .then((taskCount) => {
        this.getAllUsers();
        this.setState({ totalPages:taskCount.count });
        let totalPagesCount = Math.ceil(this.state.totalPages/10);
        if (totalPagesCount === 0) totalPagesCount = 1;
        if (totalPagesCount < this.state.currentPageNo) {
          this.setState({isTotalPagesCount : true, totalPages: totalPagesCount});
          this.redirectToPreviousPage(totalPagesCount);
        }
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        new Toast('Error while fetching task list', Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  getTaskList() {
    this.setState({
      loadingTaskList: true
    });
    startLoader();
    const params = this.getSearchParams();
    params.pageSize = 10;
    params.taskObject = this.props.matches.taskObjectType;
    params.assignedUserID = this.state.loggedUserID;
    if (this.props.matches.taskObjectType === 'billForm' && this.props.matches.status === 'accepted') {
      delete params.assignedUserID;
    }

    return http.get(`${CONSTANTS.API_URL}/api/task`, params)
      .then((taskList) => {
        this.setUserNames(taskList);
        this.calculateQuorum(taskList);
        this.setState({
          currentPageNo: params.pageNo,
          loadingTaskList: false
        });
        if ( !taskList.length && this.state.totalPages > 1 ) {
          let pageCount = params.pageNo - 1;
          if (pageCount === 0) pageCount = 1;
          if (this.state.isTotalPagesCount) {
            this.state.isTotalPagesCount = false;
            pageCount = this.state.totalPages;
          }
          this.redirectToPreviousPage(pageCount);
          return;
        }
      }).catch((HTTPException) => {
        this.setState({
          loadingTaskList: false
        });
        console.error(HTTPException);
        new Toast('Error while fetching task list', Toast.TYPE_ERROR, Toast.TIME_LONG);
        stopLoader();
      });
  }

  redirectToPreviousPage(pageCount) {
    startLoader();

    this.setState({
      currentPageNo: pageCount
    });
    let url = location.pathname + '?pageNo=' + this.state.currentPageNo;

    route(url);
    this.getTaskCount();
    this.getTaskList();
  }

  getSearchParams() {
    let params = {};

    if (this.state.status) {
      params['status'] = this.state.status;
    }
    if (this.state.currentPageNo) {
      if (this.state.currentPageNo <= 0 || (!Number(this.state.currentPageNo))) {
        this.state.currentPageNo = 1;
      }
      params['pageNo'] = this.state.currentPageNo;
    }
    return params;
  }

  setUserNames(taskList) {
    let assignedUserIDArray= [], ownerUserIDArray = [];
    taskList.map((task) => {
      assignedUserIDArray.push(task.assignedUserID);
    });
    taskList.map((task) => {
      ownerUserIDArray.push(task.authorID);
    });
    return http.get(`${CONSTANTS.API_URL}/api/user`,{noLimit: 'noLimit'})
      .then((userList) => {
        let found, i = 0, j = 0;
        assignedUserIDArray.forEach((user) => {
          found = userList.find((item) => {
            return item._id === user;
          });
          taskList[i].assignedUserName = found ? found.displayName : '-';
          i++;
        });
        ownerUserIDArray.forEach((user) => {
          found = userList.find((item) => {
            return item._id === user;
          });
          taskList[j].ownerUserName = found ? found.displayName : '-';
          j++;
        });
        this.setDepartmentNames(taskList);
      });
  }
  setDepartmentNames(taskList) {
    let departmentIDArray= [], ownerDepartmentIDArray = [];
    taskList.map((task) => {
      departmentIDArray.push(task.assignedDepartmentID);
    });
    taskList.map((task) => {
      ownerDepartmentIDArray.push(task.authorDepartmentID[0]);
    });
    return http.get(`${CONSTANTS.API_URL}/api/company/department`)
      .then((deptList) => {
        let found, i = 0, j = 0;
        departmentIDArray.forEach((user) => {
          found = deptList.find((item) => {
            return item._id === user;
          });
          taskList[i].assignedDepartmentName = found ? found.displayName : '-';
          i++;
        });
        ownerDepartmentIDArray.forEach((user) => {
          found = deptList.find((item) => {
            return item._id === user;
          });
          taskList[j].ownerDepartmentName = found ? found.displayName : '-';
          j++;
        });
        this.setState({taskList, loadingTaskList: false});
        stopLoader();
      });
  }

  calculateQuorum(taskList) {
    taskList.map((task) => {
      task.acceptanceCount = 0;
      task.reviewers.map((rev) => {
        if (rev.status === 'approved') {
          task.acceptanceCount += 1;
        }
      });
    });
  }

  rejectBillForm(e) {
    e.preventDefault();
    /*
      T1661 - Space is accepted while rejecting the billform or payment voucher.
      Developer - Arvind Shinde
      Date - 24/08/2018
    */
    if (!(e.target.comment.value.trim())) {
      return new Toast("Comment can not be empty", Toast.TYPE_ERROR, Toast.TIME_LONG);
    }
    let confirmMsg = confirm('Are you sure you want to reject this '+this.state.displayName[this.state.objectType]+' ?');
    if (confirmMsg) {
      this.setState({isRejectButtonLocked: true});
      startLoader();
      let url, body = {comment: e.target.comment.value};
      if (this.state.isRequestChanges) {
        url = `${CONSTANTS.API_URL}/api/billForm/${this.state.idOfBillFormToRequest}/requestChanges`;
        body.status = 'rejected';
      } else {
        url = `${CONSTANTS.API_URL}/api/task/${this.state.idOfTaskToApprove}/changeStatus`;
        body.decision = 'rejected';
      }
      http.put(url, body)
        .then(() => {
          stopLoader();
          new Toast(this.state.displayName[this.state.objectType]+' Rejected Successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          this.setState({rejectModal: !this.state.rejectModal, isRejectButtonLocked: false});
          this.getTaskCount();
          this.getTaskList();
        })
        .catch((HTTPException) => {
          stopLoader();
          this.setState({isRejectButtonLocked: false});
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
          console.error(HTTPException.message);
        });
    }
  }

  toggleRejectModal(row) {
    if (row._id && row.taskObject) {
      this.setState({idOfTaskToApprove: row._id, objectType: row.taskObject});
    }
    this.setState({rejectModal: !this.state.rejectModal, comment: ''});
    if (!this.state.rejectModal) {
      this.setState({isRejectButtonLocked: false});
    }
  }

  requestChangesModal(task) {
    this.setState({rejectModal: !this.state.rejectModal, comment: '',
      idOfBillFormToRequest: task.taskObjectID, isRequestChanges: true});
  }

  openHistoryModalAndGetDetails(row) {
    startLoader();
    this.setState({taskHistoryModal: true, objectType: row.taskObject,loadingTaskHistoryList:true});
    this.setAuthorName(row.authorID);
    return http.get(`${CONSTANTS.API_URL}/api/object/${row._id}/history`, {objectType: 'task'})
      .then((histories) => {
        histories.map((history) => {
          history.userName = this.getUserName(history.createdBy);
          history.departmentName = this.getDepartmentName(history.createdBy);

          if (history.changedAttribute === 'reviewer') {
            history.oldReviewerName = this.getUserName(history.oldValue);
            history.newReviewerName = this.getUserName(history.newValue);
          }
        });
        this.setState({histories, loadingTaskHistoryList: false, isViewHistory: true});
        stopLoader();
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
        this.setState({loadingTaskHistoryList:false, isViewHistory: false});
        stopLoader();
      });
  }

  closeTaskHistoryModal() {
    this.setState({taskHistoryModal: false, histories: []});
  }

  setAuthorName(userID) {
    http.get(`${CONSTANTS.API_URL}/api/user/${userID}`)
      .then((userInfo) => {
        this.setState({taskOwnerName: userInfo.displayName});
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
      });
  }

  getUserName(userID) {
    let userName = this.state.allUsers.filter( (elem) => {
      if (elem._id === userID) return elem;
    })[0];
    return userName ? userName.displayName : '-';
  }

  onChangePageClick(pageNo) {
    this.setState({currentPageNo: pageNo});
    let url = location.pathname + '?pageNo=' + this.state.currentPageNo;

    route(url);
    this.getTaskList(pageNo);
  }

  onChangeReviewerClick(taskID) {
    this.setState({isSubmitForReviewModalOpen: true, isChangeReviewer: true,
      idOfTaskToChangeReviewer: taskID, submitModalTitle: 'Change Reviewer'});
  }

  getDepartmentName(userID) {
    let departmentName;
    this.state.allUsers.filter( (elem) => {
      if (elem._id === userID) {
        departmentName = this.state.departmentList.filter((department) => {
          if (elem.departmentIDs[0] === department._id) {
            return department;
          }
        })[0];
      }
    });
    return departmentName ? departmentName.displayName : '-';
  }

  toggleOfflineProcessingModal(row) {
    this.getBillFormDetails(row.taskObjectID);
    this.setState({isOfflinePaymentVoucherModal: !this.state.isOfflinePaymentVoucherModal,
      paymentVoucherNumber: '', amount: '', date: '', paymentVoucherFile: '',paymentInstrumentDate:''});
  }

  getBillFormDetails(billFormID) {
    http.get(`${CONSTANTS.API_URL}/api/billform/${billFormID}`)
      .then((response) => {
        this.setState({selectedBillForm: response});
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
      });
  }

  closeModal() {
    this.setState({isOfflinePaymentVoucherModal: false, paymentVoucherNumber: '', amount: '', date: '',
      paymentVoucherFile: '', selectedBillForm: {}, paymentInstrumentFile: '',paymentMode:''});
  }

  createPaymentVoucherOffline(e) {
    e.preventDefault();
    this.setState({isButtonLocked: true});
    let body = {
      billFormID: this.state.selectedBillForm._id,
      number: e.target.paymentVoucherNumber.value,
      amount: e.target.amount.value,
      date: e.target.date.value,
      paymentMode: e.target.paymentMode.value,
      paymentInstrumentFileIDs: []
    };
    if (e.target.paymentModeNumber && e.target.paymentModeNumber.value) {
      body.paymentModeNumber = e.target.paymentModeNumber.value;
    }
    if (e.target.paymentInstrumentDate && e.target.paymentInstrumentDate.value) {
      body.paymentInstrumentDate = e.target.paymentInstrumentDate.value;
    }
    if (e.target.paymentMode.value === 'cash') {
      body.paymentModeNumber = '';
    }
    let paymentVoucherfileObj = {
      name: e.target.paymentVoucherFile.files[0].name,
      size: e.target.paymentVoucherFile.files[0].size,
      type: e.target.paymentVoucherFile.files[0].type,
      value:  e.target.paymentVoucherFile.value
    };
    let paymentInstrumentFilesArray = [];

    if (e.target.paymentInstrumentFile.files.length) {
      for (let i = 0; i < e.target.paymentInstrumentFile.files.length; i++) {
        paymentInstrumentFilesArray.push({
          name: e.target.paymentInstrumentFile.files[i].name,
          size: e.target.paymentInstrumentFile.files[i].size,
          type: e.target.paymentInstrumentFile.files[i].type,
          value: e.target.paymentInstrumentFile.files[i].name
        });
      }
      this.uploadPaymentInstrumentFiles(paymentInstrumentFilesArray, e, body)
        .then(() => {
          this.uploadPaymentVoucherFile(paymentVoucherfileObj, e, body);
        });
    } else {
      this.uploadPaymentVoucherFile(paymentVoucherfileObj, e, body);
    }
  }

  uploadPaymentInstrumentFiles(filesArray, e, body) {
    let signedUrlPromise = [], uploadFilePromise = [];
    filesArray.map((file) => {
      //Get signed url for each file
      signedUrlPromise.push(http.post(`${CONSTANTS.API_URL}/api/file/getSignedUrl`, { file }));
    });
    return Promise.all(signedUrlPromise).then((filesResponse) => {
      const opts = {
        headers: [{
          name: 'Content-Type',
          value: 'multipart/form-data'
        }]
      };
      //Upload each file using signed url obtained above
      for (let i = 0; i< filesResponse.length; i++) {
        uploadFilePromise.push(http.put(filesResponse[i].signedURL, e.target.paymentInstrumentFile.files[i], opts));
        //Push file's ID in body object to send to backend
        body.paymentInstrumentFileIDs.push(filesResponse[i]._id);
      }
      return Promise.all(uploadFilePromise).then(() => {
        return;
      });
    })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  approveQuorumZeroObject() {
    let confirmMsg = confirm(`Are you sure you want to approve this ${this.state.displayName[this.state.objectType]}?`);
    if (!confirmMsg) return;
    return http.put(`${CONSTANTS.API_URL}/api/object/${this.state.idOfObjectToSubmit}/approve?objectType=${this.state.objectType}`,
      {
        status: 'approved'
      })
      .then(() => {
        if (this.state.billFormVisibilityMode === 'otherdepartment') {
          new Toast('Billform approved & sent to next department successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        } else {
          new Toast('Billform approved successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        }
        this.toggleSubmitForFurtherReview();
        this.getTaskCount();
        this.getTaskList();
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  isBillFormMarkAsPaidButtonVisible(row) {
    const responsibleDepartment = row.assignedDepartmentID;
    const loggedUserDepartment = this.state.loggedUserDepartmentIDs;
    const condition = loggedUserDepartment.includes(responsibleDepartment);
    return condition;
  }

  uploadPaymentVoucherFile(fileObj, e, body) {
    startLoader();
    http.post(`${CONSTANTS.API_URL}/api/file/getSignedUrl`,
      {
        file: fileObj
      })
      .then((fileDetails) => {
        const opts = {
          headers: [{
            name: 'Content-Type',
            value: 'multipart/form-data'
          }]
        };
        let fileData = e.target.paymentVoucherFile.files[0];
        return http.put(fileDetails.signedURL, fileData, opts)
          .then(() => {
            this.callApiPaymentVoucherOffline(body, fileDetails)
              .then(() => {
                return this.setState({isButtonLocked: false});
              });
          });
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
        this.setState({isButtonLocked: false});
        stopLoader();
      });
  }

  callApiPaymentVoucherOffline(body, file) {
    if (file) {
      body.paymentVoucherFileID = file._id;
    }
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/paymentVoucher/processOffline`, body)
      .then(() => {
        new Toast('File uploaded and Payment Voucher created successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.closeModal();
        this.getTaskCount();
        this.getTaskList();
      })
      .catch((HTTPException) => {
        stopLoader();
        //T1297
        //developer: samruddhi
        //date: 6/7/2018
        //error msg added
        console.error(HTTPException.message);
        if (HTTPException.statusCode=== 400 ) {
          new Toast('Empty Fields are not accepted.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        } else if (HTTPException.message.includes('duplicate')) {
          new Toast('Could not create Payment Voucher, Payment Voucher you are trying to create already exist.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        } else new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  getPaymentVoucherFileAndCheckSize(e) {
    if (e.target.files[0].size > 5242880) {
      new Toast('File size should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
      return e.target.value = null;
    }
    this.setState({paymentVoucherFile: e.target.value});
  }

  getPaymentInstrumentFileAndCheckSize(e) {
    for (let i = 0; i < e.target.files.length; i++) {
      if (e.target.files[i].size > 5242880) {
        new Toast('File size for all files should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
        e.target.value = null;
        break;
      }
      this.setState({paymentInstrumentFile: e.target.value});
    }
  }

  onPaymentModeSelection(e) {
    this.setState({paymentModeNumber: '', paymentMode: e.target.value,isPaymentModeSelected: true, paymentInstrumentDate: null});
    document.getElementById('createPaymentVoucherOffline').elements.paymentInstrumentDate.value = null;
  }

  setParamsToState(params) {
    if (params.pageNo) {
      this.state.currentPageNo = Number(params.pageNo);
      if (this.state.currentPageNo <= 0 || (!Number(this.state.currentPageNo))) {
        this.state.currentPageNo = 1;
      }
    }
    if (params.status) {
      this.state.status = params.status;
    }
  }

  markBillFormPaid(id) {
    let confirmation = confirm('The status of'+ this.state.billFormDisplayName +' will be changed to PAID along with all the bills. Are you '+
    'sure you want to proceed?');
    if (!confirmation) return;
    return http.put(`${CONSTANTS.API_URL}/api/billform/${id}/changeStatus`, { status: 'paid' })
      .then(() => {
        new Toast(this.state.billFormDisplayName+" Successfully marked as 'Paid'", Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getTaskCount();
        this.getTaskList();
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
        new Toast('Error while reading file', Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  toggleMarkAsPaidModal(id) {
    this.setState({
      markAsPaid: !this.state.markAsPaid,
      receiptFile: null,
      receiptNumber: '',
      idOfBillFormToPay: id,
      paymentType: '',
      actualAmountPaid: ''
    });
  }

  getPaymentType(e) {
    this.setState({
      paymentType: e.target.value
    });
  }

  getReceiptFileAndCheckFileSize(e) {
    this.setState({receiptFile: e.target.value});
    if (e.target.files[0].size > 5242880) {
      new Toast('File size should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
      return e.target.value = null;
    }
  }

  uploadReceipt(e) {
    e.preventDefault();
    if (e.target.paymentType.value === 'individual' || !e.target.receiptFile.files.length) {
      return this.callApiForMarkasPaid(e);
    }
    const fileObj = {
      name:e.target.receiptFile.files[0].name,
      size:e.target.receiptFile.files[0].size,
      type:e.target.receiptFile.files[0].type,
      value: e.target.receiptFile.value
    };
    http.post(`${CONSTANTS.API_URL}/api/file/getSignedUrl`,
      {
        file: fileObj
      })
      .then((fileDetails) => {
        const opts = {
          headers: [{
            name: 'Content-Type',
            value: 'multipart/form-data'
          }]
        };
        let fileData = e.target.receiptFile.files[0];
        return http.put(fileDetails.signedURL, fileData, opts)
          .then(() => {
            return this.callApiForMarkasPaid(e, fileDetails);
          });
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  callApiForMarkasPaid(e, file) {
    let body = {
      paymentType: e.target.paymentType.value,
      status: 'paid'
    };
    if (e.target.actualAmountPaid && e.target.actualAmountPaid.value) {
      body.actualAmountPaid = e.target.actualAmountPaid.value;
    }
    if (this.state.receiptNumber) {
      body.receiptNumber = e.target.receiptNumber.value;
    }
    if (file) {
      body.fileID = file._id;
    }
    return http.put(`${CONSTANTS.API_URL}/api/billform/${this.state.idOfBillFormToPay}/changeStatus`, body)
      .then(() => {
        new Toast(this.state.billFormDisplayName+" successfully marked as paid.", Toast.TYPE_DONE, Toast.TIME_LONG);
        this.toggleMarkAsPaidModal();
        this.getTaskCount();
        this.getTaskList();
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  // selectTaskAction(task, e) {
  //   if (e.target.value === 'toggleSubmitForFurtherReview') {
  //     this.toggleSubmitForFurtherReview(task);
  //   }
  //   if (e.target.value === 'toggleSubmitForReview') {
  //     this.toggleSubmitForReview(task);
  //   }
  //   if (e.target.value === 'toggleRejectModal') {
  //     this.toggleRejectModal(task);
  //   }
  //   if (e.target.value === 'processInPowerdek') {
  //     route('/billform/' + task.taskObjectID + '/paymentVoucher/add');
  //   }
  //   if (e.target.value === 'processOutsidePowerdek') {
  //     this.toggleOfflineProcessingModal(task);
  //   }
  //   if (e.target.value === 'requestChangesModal') {
  //     this.requestChangesModal(task);
  //   }
  //   if (e.target.value === 'toggleMarkAsPaidModal') {
  //     this.toggleMarkAsPaidModal(task.taskObjectID);
  //   }
  //   if (e.target.value === 'onChangeReviewerClick') {
  //     this.onChangeReviewerClick(task._id);
  //   }
  //   if (e.target.value === 'openHistoryModalAndGetDetails') {
  //     this.openHistoryModalAndGetDetails(task);
  //   }
  //
  //
  // }

  componentWillReceiveProps(props) {
    this.setParamsToState(props.matches);
    this.getTaskCount();
    this.getTaskList();
  }

  componentDidMount() {
    this.setParamsToState(this.props.matches);
    this.getTaskCount();
    this.getTaskList();
    this.getDepartmentList();
  }

  render({}, state) {
    return (
      <div>
        <section class="box main-navigation">
          <div>
            {
              state.status === 'accepted' &&
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 no-padding">
                  <h6 >Payment Requests</h6>
                </div>
            }
            {
              state.status !== 'accepted' &&
                <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 no-padding">
                  <h6>Requests</h6>
                </div>
            }
          </div>
        </section>
        {
          state.status !== 'accepted' &&
            <section class="box">
              <div class="row">
                {
                  state.status === 'underreview' && (
                    <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                      <span style="margin-right:10px">
                        <em style="font-size:1em;color:limegreen" class="icon icon-check-square"/> <span style="font-size:1.1em">Approve</span>
                      </span>
                      <span style="margin-right:10px">
                        <em style="font-size:1em;color:red" class="icon icon-cancel-squared"/> <span style="font-size:1.1em"> Reject</span>
                      </span>
                      <span>
                        <em style="font-size:1em;color:#808080" class="icon icon-pencil-square-o"/> <span style="font-size:1.1em"> Change Reviewer</span>
                      </span>
                    </div>
                  )
                }
                {
                  state.status === 'rejected' && (
                    <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                      <span style="margin-right:10px">
                        <em style="font-size:1em;color:limegreen" class="icon icon-check-square"/> <span style="font-size:1.1em">Submit for Review</span>
                      </span>
                    </div>
                  )
                }
              </div>
            </section>
        }
        {
          (state.taskList.map((row) => (
            <div class="row dashboard-task-tile">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <div class="row" style="margin:5px">
                  <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-left">
                    <div class={`box ${this.props.matches.taskObjectType !== 'billForm' && this.props.matches.status !== 'accepted' ?
                      'slide-wrapper' : ''}`} style="margin:0 !important;">
                      <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">

                        {
                          row.taskObject === 'billForm' &&
                          (<span style="font-size:1em">
                            {state.displayName[row.taskObject]}
                            <Link activeClassName="active" href={`/billform/${row.taskObjectID}`}>
                              <span style="color: #333;padding-left: 10px;">{row.taskName}</span>
                            </Link>
                          </span>)
                        }
                        {
                          row.taskObject === 'paymentVoucher' &&
                          (<span style="font-size:1em">
                            {state.displayName[row.taskObject]}
                            <Link activeClassName="active" href={`/paymentVoucher/${row.taskObjectID}`}>
                              <span style="color: #333;padding-left: 10px;">{row.taskName}</span>
                            </Link>
                          </span>)
                        }
                      </p>
                      <span class="slide">
                        <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-left" style="float:right">
                          <div class="row">
                            {
                              (row.acceptanceCount >= (row.quorum -1)) && row.status !== 'rejected'
                               && row.status !== 'accepted' && state.loggedUserID.toString() === row.assignedUserID.toString() &&
                              (
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important;"
                                    onClick={this.toggleSubmitForFurtherReview.bind(this, row)}>
                                    <span>
                                      <em style="font-size: 1.2rem;color:limegreen" class="icon-check-square"/>
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                            {
                              !(row.acceptanceCount >= (row.quorum -1)) && (row.status !== 'accepted' && row.status !== 'rejected') &&
                              state.loggedUserID.toString() === row.assignedUserID.toString() &&
                              (
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important;"
                                    onClick={this.toggleSubmitForReview.bind(this, row)}>
                                    <span>
                                      <em style="font-size: 1.2rem;color:limegreen" class="icon-check-square"/>
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                            {
                              row.status !== 'rejected' && row.status !== 'accepted' &&
                              state.loggedUserID.toString() === row.assignedUserID.toString() &&
                              (
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important;"
                                    onClick={this.toggleRejectModal.bind(this, row)}>
                                    <span>
                                      <em style="font-size: 1.2rem;color:red" class="icon-cancel-squared"/>
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                            {
                              row.quorum === 0 && row.status === 'rejected' && (
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important;"
                                    onClick={this.toggleSubmitForFurtherReview.bind(this, row)}>
                                    <span>
                                      <em style="font-size: 1.2rem;color:limegreen" class="icon-check-square"/>
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                            {
                              row.status === 'rejected' && row.status !== 'accepted' &&
                                state.loggedUserID.toString() === row.assignedUserID.toString() && row.quorum !== 0 &&
                              (
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important;"
                                    onClick={this.toggleSubmitForReview.bind(this, row)}>
                                    <span>
                                      <em style="font-size: 1.2rem;color:limegreen" class="icon-check-square"/>
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                            {
                              (row.updatedBy && row.updatedBy.toString() === state.loggedUserID.toString())
                             && (row.status === 'underreview' && row.status !== 'rejected') && (
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important;"
                                    onClick={this.onChangeReviewerClick.bind(this, row._id)}>
                                    <span>
                                      <em style="font-size: 1.2rem;color:#808080" class="icon icon-pencil-square-o"/>
                                    </span>
                                  </div>
                                </div>
                              )
                            }

                          </div>
                        </div>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )))
        }
        {
          !state.taskList.length && state.loadingTaskList && (
            <div>
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-left">
                <span>Loading...</span>
              </div>
            </div>
          )
        }
        {
          !state.taskList.length && !state.loadingTaskList && (
            <div>
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-left">
                <span>No Data Found</span>
              </div>
            </div>
          )
        }
        {
          state.taskList.length > 0 && !state.loadingTaskList && (
            <div>
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-right no-padding pagination">
                <Pagination count={this.state.totalPages} currentPageNo={this.state.currentPageNo} onChangePageClick={this.onChangePageClick.bind(this)} />
              </div>
            </div>
          )
        }


        {/*
        <section class="column no-padding" style="width: 100%;">
          <div class="box">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    (state.taskList.map((row) => (<tr>
                      {
                        row.taskObject === 'billForm' &&
                        (<td>{state.displayName[row.taskObject]}<br/>
                        <Link activeClassName="active" href={`/billform/${row.taskObjectID}`}>{row.taskName}</Link></td>)
                      }
                      {
                        row.taskObject === 'paymentVoucher' &&
                        (<td>{state.displayName[row.taskObject]}<br/>
                        <Link activeClassName="active" href={`/paymentVoucher/${row.taskObjectID}`}>{row.taskName}</Link></td>)
                      }
                      <td>
                        {
                          (row.acceptanceCount >= (row.quorum -1)) && row.status !== 'rejected'
                           && row.status !== 'accepted' && state.loggedUserID.toString() === row.assigedUserID.toString() &&
                          (<em style="padding: 5px; font-size: 1.2rem;" class="icon icon-check-square"
                          onClick={this.toggleSubmitForFurtherReview.bind(this, row)}/>)
                        }
                        {
                          !(row.acceptanceCount >= (row.quorum -1)) && (row.status !== 'accepted' && row.status !== 'rejected') &&
                          state.loggedUserID.toString() === row.assignedUserID.toString() &&
                          (<em style="padding: 5px; font-size: 1.2rem;" class="icon icon-check-square" onClick={this.toggleSubmitForReview.bind(this, row)}/>)
                        }
                        {
                          row.status !== 'rejected' && row.status !== 'accepted' &&
                          state.loggedUserID.toString() === row.assignedUserID.toString() &&
                          (<em style="padding: 5px; font-size: 1.2rem;" class="icon icon-cancel-squared" onClick={this.toggleRejectModal.bind(this, row)}/>)
                        }
                        {
                          row.quorum === 0 && row.status === 'rejected' &&
                        (<em style="padding: 5px; font-size: 1.2rem;" class="icon icon-check-square"
                          onClick={this.toggleSubmitForFurtherReview.bind(this, row)}/>)
                        }
                        {
                          row.status === 'rejected' && row.status !== 'accepted' &&
                            state.loggedUserID.toString() === row.assignedUserID.toString() && row.quorum !== 0 &&
                          (<em style="padding: 5px; font-size: 1.2rem;" class="icon icon-check-square" onClick={this.toggleSubmitForReview.bind(this, row)}/>)
                        }
                        {
                          (row.updatedBy && row.updatedBy.toString() === state.loggedUserID.toString())
                         && (row.status === 'underreview' && row.status !== 'rejected') &&
                         (<em style="padding: 5px; font-size: 1.2rem;" class="icon icon-pencil-square-o"
                         onClick={this.onChangeReviewerClick.bind(this, row._id)}/>)
                        }
                      </td>
                    </tr>)))
                  }
                  {
                    !state.taskList.length && state.loadingTaskList && (
                      <span>Loading...</span>
                    )
                  }
                  {
                    !state.taskList.length && !state.loadingTaskList && (
                      <span>No Data Found</span>
                    )
                  }
                </tbody>
              </table>
              <div class="has-text-right column no-padding pagination">
                <Pagination count={this.state.totalPages} currentPageNo={this.state.currentPageNo} onChangePageClick={this.onChangePageClick.bind(this)} />
              </div>
            </div>
          </div>
        </section>
        */}
        {
          this.state.rejectModal &&
          <Modal title={"Reject "+this.state.displayName[this.state.objectType]} modalSize="is-medium"
            onClose={this.toggleRejectModal.bind(this)}>
            <form name="submitForFurtherReview" onSubmit={this.rejectBillForm.bind(this)}>
              <ModalBody>
                <textarea value={this.state.comment} required
                  onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
              </ModalBody>
              <ModalFooter>
                <button disabled={this.state.isRejectButtonLocked} class="button button-small" type="submit">
                Reject <em class="icon icon-cancel-squared" /></button>
              </ModalFooter>
            </form>
          </Modal>
        }
        {
          state.isSubmitForReviewModalOpen && (
            <Modal title={state.submitModalTitle} modalSize="is-medium" onClose={this.toggleReview.bind(this)}>
              <form name="Submit" onSubmit={this.submitForReview.bind(this)}>
                <ModalBody>
                  {
                    !state.isChangeReviewer && (state.currentStatus === 'underreview') &&
                      <div class="row">
                        <div class="column">
                          <strong>{state.quorum}</strong> approvals are mandatory to process payment of the {state.displayName[this.state.objectType]}.
                          <br />
                          {
                            state.acceptanceCount > 0 &&
                            <span>
                              {
                                state.acceptanceCount === 1 &&
                                <span>
                                  <strong>{state.acceptanceCount}</strong> reviewer has already approved the {state.displayName[this.state.objectType]}.
                                </span>
                              }
                              {
                                state.acceptanceCount !== 1 &&
                                <span>
                                  <strong>{state.acceptanceCount}</strong> reviewers have already approved the {state.displayName[this.state.objectType]}.
                                </span>
                              }
                            </span>
                          }
                          <br />
                          Please select a reviewer for next approval.
                        </div>
                      </div>
                  }
                  <div class="row m-t-10">
                    <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6 select">
                      <select name='department' value={state.department} onInput={linkState(this, 'department')}
                        required onChange={this.loadUsers.bind(this)}>
                        <option value='' selected>Select Department</option>
                        {
                          state.departmentList.map((list, index) =>
                            ( <option value={list._id} key={index}>{list.displayName}</option>))
                        }
                      </select>
                    </div>
                    <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6 select">
                      <select name='reviewer' disabled={this.state.isEnableReviewerDropdown === false}
                        value={state.reviewer} onInput={linkState(this, 'reviewer')} required>
                        <option value='' selected>Select Reviewer</option>
                        {
                          state.userList.map((list, index) =>
                            ( <option value={list._id} key={index}>{list.displayName}</option>))
                        }
                      </select>
                    </div>
                  </div>
                  <div class="row m-t-10">
                    <div class="col-xs-12 col-sm-12 col-md-12 col-lg-6">
                      <textarea value={state.comment} onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button disabled={this.state.isSubmitButtonLocked}  class="button button-small" type="submit">Submit</button>
                </ModalFooter>
              </form>
            </Modal>
          )
        }
        {
          state.showQuorumFullMessageModal &&
            <Modal title="Submit For Review" modalSize="is-medium" onClose={this.toggleSubmitForFurtherReview.bind(this)}>
              <form name="submitForFurtherReview" onSubmit={this.approveBillForm.bind(this)}>
                <ModalBody>
                  {
                    this.state.quorum > 0 &&
                    <p>
                      Minimum review number for this {state.displayName[this.state.objectType]} is satisfied. If you want to send for another review,
                       click on 'Submit for Review', else click on 'Approve' to approve this {state.displayName[this.state.objectType]}
                    </p>
                  }
                  {
                    this.state.quorum === 0 &&
                    <p>
                      This action will approve the {state.displayName[this.state.objectType]}, however if you want to send it for review
                      click on 'Submit for Review' button, else click on 'Approve' button.
                    </p>
                  }
                </ModalBody>
                <ModalFooter>
                  <button type="button" class="button button-small" onClick={this.toggleReview.bind(this)}>Request a Review</button>
                  {
                    this.state.quorum > 0 &&
                    <button type="submit" class="button button-small" disabled={this.state.isApproveButtonLocked}>
                    Approve <em class="icon icon-check-square" /></button>
                  }
                  {
                    this.state.quorum === 0 &&
                    <button type="button" class="button button-small" onClick={this.approveQuorumZeroObject.bind(this)}>
                    Approve <em class="icon icon-check-square" /></button>
                  }
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.taskHistoryModal &&
            <Modal title={state.displayName[state.objectType]+ " Task History"} modalSize="is-medium" onClose={this.closeTaskHistoryModal.bind(this)}>
              <ModalBody>
                <div style="height: 50vh;" class="table-responsive">
                  <p style="font-size: 1.2rem; padding-bottom: 5px;"><strong>Task Owner: {state.taskOwnerName || '-'}</strong></p>
                  {
                    !state.histories.length && this.state.loadingTaskHistoryList && (
                      <span class="button-margin-left">Loading...</span>
                    )
                  }
                  {
                    !state.histories.length && !this.state.loadingTaskHistoryList && (
                      <span class="button-margin-left">No History Found</span>
                    )
                  }
                  {
                    state.isViewHistory &&
                    <table>
                      <thead>
                        <tr>
                          <th>Responsible User</th>
                          <th>Action</th>
                          <th>Comment</th>
                          <th>Action Taken At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          state.histories.map((row) => (
                            <tr>
                              <td>{row.userName} <br/>
                                ({row.departmentName})</td>
                              <td>
                                {
                                  row.changedAttribute === 'reviewer' &&
                                  <span>Reviewer changed from {row.oldReviewerName} to {row.newReviewerName}</span>
                                }
                                {
                                  (row.changedAttribute !== 'reviewer' && row.newValue === 'approved' && row.responsibleUserID) &&
                                  (<span>Approved & Submitted for further review</span>) ||
                                  <span>{this.state.historyStatuses[row.newValue]}</span>
                                }
                              </td>
                              <td>{row.comment || '-'}</td>
                              <td>{formatDateTime(row.createdAt, true)}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                      {/* T1031 - Remove footer from everywhere
                        <tfoot>
                        <tr>
                          <th>Responsible User</th>
                          <th>Department</th>
                          <th>Action</th>
                          <th>Comment</th>
                          <th>Action Taken At</th>
                        </tr>
                      </tfoot>*/}
                    </table>
                  }
                </div>
              </ModalBody>
            </Modal>
        }
        {
          this.state.isOfflinePaymentVoucherModal &&
            <Modal title="Upload Payment Voucher processed outside Powerdek" modalSize="is-medium" onClose={this.closeModal.bind(this)}>
              <form id="createPaymentVoucherOffline" name="createPaymentVoucherOffline" onSubmit={this.createPaymentVoucherOffline.bind(this)}>
                <ModalBody>
                  <label>{this.state.billFormDisplayName} Number</label>
                  <span>{this.state.selectedBillForm.customerBillFormNumber}</span>
                  <label>Voucher Number
                    <input type="text" value={this.state.paymentVoucherNumber} onInput={linkState(this, 'paymentVoucherNumber')}
                      name="paymentVoucherNumber" required />
                  </label>
                  <label>Amount
                    <input type="number" value={this.state.selectedBillForm.amount} onInput={linkState(this, 'amount')} name="amount"
                      disabled required />
                  </label>
                  <label>Date</label>
                  <input type="date" value={this.state.date} onInput={linkState(this, 'date')} name="date" required />

                  <label>Payment Mode</label>
                  <input type="radio" checked={this.state.paymentMode === 'cash'} required name="paymentMode" value="cash"
                    onChange={this.onPaymentModeSelection.bind(this)} />Cash
                  <input type="radio" checked={this.state.paymentMode === 'cheque'} required name="paymentMode" value="cheque"
                    onChange={this.onPaymentModeSelection.bind(this)}/>Cheque
                  <input type="radio" checked={this.state.paymentMode === 'DD'} required name="paymentMode" value="DD"
                    onChange={this.onPaymentModeSelection.bind(this)}/>Demand Draft
                  <label>Payment Mode Ref. Number</label>
                  <input type="text" name="paymentModeNumber" disabled={this.state.paymentMode === 'cash' || !this.state.isPaymentModeSelected}
                    value={this.state.paymentModeNumber} onInput={linkState(this, 'paymentModeNumber', 'target.value')}
                    required={this.state.paymentMode === 'cheque' || this.state.paymentMode === 'DD'}/>
                  <label>Payment Instrument Date</label>
                  <input type="date" disabled={this.state.paymentMode === 'cash' || !this.state.isPaymentModeSelected}  name="paymentInstrumentDate"
                    value={this.state.paymentInstrumentDate}  onInput={linkState(this, 'paymentInstrumentDate')}/>
                  <label>Payment Voucher File</label>
                  <input type="file" onChange={this.getPaymentVoucherFileAndCheckSize.bind(this)} value={this.state.paymentVoucherFile}
                    accept=".pdf,.jpg,.jpeg" id="paymentVoucherFile" name="paymentVoucherFile" required />
                  <label>Payment Instrument Files</label>
                  (You can select multiple files here)
                  <input type="file" onChange={this.getPaymentInstrumentFileAndCheckSize.bind(this)} value={this.state.paymentInstrumentFile}
                    accept=".pdf,.jpg,.jpeg" id="paymentInstrumentFile" name="paymentInstrumentFile" multiple/>
                </ModalBody>
                <ModalFooter>
                  <button disabled={this.state.isButtonLocked}>Create</button>
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.markAsPaid && (
            <Modal title="Receipt Details" modalSize="is-medium" onClose={this.toggleMarkAsPaidModal.bind(this)}>
              <form name="markAsPaidForm" onSubmit={this.uploadReceipt.bind(this)}>
                <ModalBody>
                  <div>
                    <input type="radio" name="paymentType" value="bulk" checked={this.state.paymentType === 'bulk'}
                      onChange={this.getPaymentType.bind(this)} required /> Bulk
                    <input type="radio" name="paymentType" value="individual" checked={this.state.paymentType === 'individual'}
                      onChange={this.getPaymentType.bind(this)} required /> Individual
                  </div>
                  <div>
                    {
                      this.state.paymentType === "bulk" &&
                      (<div>
                        Upload File: <input onChange={this.getReceiptFileAndCheckFileSize.bind(this)} type="file" name="receiptFile"
                          value={this.state.receiptFile} accept=".pdf,.jpg,.jpeg" id="receiptFile" />
                        <input required type="text" value={this.state.receiptNumber} onInput={linkState(this, 'receiptNumber')}
                          placeholder="Enter Receipt Number" name="receiptNumber" />
                        <input required type="number" value={this.state.actualAmountPaid} onInput={linkState(this, 'actualAmountPaid')}
                          placeholder="Enter Actual Amount Paid" name="actualAmountPaid" />
                      </div>)
                    }
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button>Submit</button>
                </ModalFooter>
              </form>

            </Modal>
          )
        }

      </div>

    );
  }
}
