import { h, Component } from 'preact';
import http from 'fetch-bb';
import { Toast } from '../../lib/toastr';
import CONSTANTS from '../../lib/constants';
import { AppStore } from '../../lib/store';
import { route } from 'preact-router';
import { Modal, ModalBody, ModalFooter } from '../../components/modal';
import linkState from 'linkstate';
import { formatDateTime, startLoader, stopLoader, getFormattedAmount, amountInWordsConversion } from '../../lib/utils';
// import PaymentVoucherHistory from '../../components/paymentVoucherHistory';
// import PaymentVoucherPreview from '../../components/paymentVoucherPreview';

export default class BillFormDetails extends Component {
  componentWillMount() {
    this.state = {
      displayViewName:'viewPaymentVoucherDetails',
      paymentVoucherDetails: {paymentInstrumentFile: [], paymentVoucherFile: {}},
      paymentVoucherID: '',
      userList: [],
      departmentList: [],
      isSubmitForReviewModalOpen: false,
      showQuorumFullMessageModal: false,
      rejectModal: false,
      department: '',
      reviewer: '',
      comment: '',
      statuses: {
        draft: 'Draft',
        submittedforreview: 'Submitted For Review',
        approved: 'Approved',
        rejected: 'Rejected',
        paid: 'Paid',
        paymentreleased: 'Payment Released'
      },
      historyStatuses: {
        underreview: 'Submitted for review',
        approved: 'Approved',
        rejected: 'Rejected',
        accepted: 'Approved'
      },
      allUsers: [],
      taskHistoryList: [],
      taskDetails: {},
      isViewHistory: false,
      loggedUserID: '',
      histories: [],
      paymentVoucherHistoryModal: false,
      isSubmitButtonLocked: false,
      isApproveButtonLocked:  false,
      isRejectButtonDisabled: false,
      loadingPaymentVoucherHistory: false,
      isApproveButtonVisible: false,
      isSubmitForReviewButtonVisible: false,
      isClientAdmin: AppStore.get('userinfo').isClientAdmin,
      userInfo: AppStore.get('userinfo'),
      markAsPaid: false,
      receiptFile: null,
      receiptNumber: '',
      actualAmountPaid: '',
      paymentType: '',
      isEnableReviewerDropdown: false
    };

    const userInfo = AppStore.get('userinfo');
    this.setState({loggedUserID: userInfo.id, paymentVoucherQuorum: userInfo.company.metadata.paymentAdviceQuorum,
      /*
      T1498: Display Name for bill form
      Developer: Samruddhi
      Date: 17/7/2018
      */
      billFormDisplayName: userInfo.company.billFormDisplayName});
  }

  deletePaymentVoucher() {
    let res;
    if (this.state.paymentVoucherDetails.taskID && this.state.paymentVoucherDetails.status === 'rejected') {
      res = confirm('This payment voucher is under review cycle & have a task created for it.'+
      'If you choose to proceed, the task associated will also be deleted. Are you sure you want to delete this payment voucher?');
    } else {
      res = confirm('Are you sure you want to delete this payment voucher?');
    }
    /*
    T1660: When payment voucher is deleted then user is redirected to Draft tab of My Payment Voucher list.
    Developer: Manohar
    Date: 23/08/18
    Comment: After delete paymentvoucher redirect to payvement voucher list and total tab selected
    */
    if (res) {
      return http.del(`${CONSTANTS.API_URL}/api/paymentvoucher/${this.state.paymentVoucherID}`)
        .then(() => {
          new Toast('Payment Voucher deleted successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          return route('/paymentVouchers');
        })
        .catch((HTTPException) => {
          console.error(HTTPException);
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        });
    }
  }

  getPaymentVoucherDetails() {
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/paymentvoucher/${this.state.paymentVoucherID}`)
      .then((response) => {

        let amountArray = response.amount.toFixed(2).split('.');
        let convertedRupee = amountInWordsConversion(Number(amountArray[0]));
        response.convertedRupee = convertedRupee;
        let convertedPaise = amountInWordsConversion(Number(amountArray[1]));
        response.convertedPaise = convertedPaise;

        this.setState({ paymentVoucherDetails: response });
        if (response.attachments.length) this.getFiles();
        if (response.taskID) this.getTaskDetails();
        this.state.paymentVoucherDetails.paidBy = AppStore.get('userinfo').company.name;
        this.state.paymentVoucherDetails.date = new Date(this.state.paymentVoucherDetails.date);
        this.state.paymentVoucherDetails.paymentInstrumentDate = this.state.paymentVoucherDetails.paymentInstrumentDate ?
          new Date(this.state.paymentVoucherDetails.paymentInstrumentDate) : null;
        this.setState({paymentVoucherDetails:this.state.paymentVoucherDetails});
        // if (this.state.paymentVoucherDetails.taskID) this.getTaskDetails();
        return http.get(`${CONSTANTS.API_URL}/api/discom`, {id:response.discomID})
          .then((discomResponse) => {
            this.state.paymentVoucherDetails.payee = discomResponse[0].name;
            this.setState({paymentVoucherDetails:this.state.paymentVoucherDetails});
            return http.get(`${CONSTANTS.API_URL}/api/billform/${response.billFormID}`)
              .then((billFormResponse) => {
                this.state.paymentVoucherDetails.billFormNumber = billFormResponse.customerBillFormNumber;
                this.setState({paymentVoucherDetails:this.state.paymentVoucherDetails});
                // if (response.attachments.length) this.getFiles();
                stopLoader();
              });
          });
      }).catch((HTTPException) => {
        console.error(HTTPException);
        stopLoader();
      });
  }

  getFiles() {
    this.state.paymentVoucherDetails.paymentInstrumentFile = [];
    let fileIDs = [];
    this.state.paymentVoucherDetails.attachments.map((attachment) => {
      fileIDs.push(attachment.fileID);
    });
    return http
      .get(`${CONSTANTS.API_URL}/api/files`, {fileIDs})
      .then((files) => {
        files.map((file) => {
          this.state.paymentVoucherDetails.attachments.map((attachment) => {
            if (attachment.attachmentType === 'paymentVoucher' && (file._id === attachment.fileID)) {
              this.state.paymentVoucherDetails.paymentVoucherFile = {
                url: file.signedURL,
                name: file.name
              };
            }
            if (attachment.attachmentType === 'paymentInstrument' && (file._id === attachment.fileID)) {
              this.state.paymentVoucherDetails.paymentInstrumentFile.push({url: file.signedURL, name: file.name});
            }
          });
        });
        this.setState({paymentVoucherDetails: this.state.paymentVoucherDetails});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        new Toast('Error while reading file', Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }


  getTaskDetails() {
    return http.get(`${CONSTANTS.API_URL}/api/task/${this.state.paymentVoucherDetails.taskID}`, {taskObject: 'paymentVoucher' })
      .then((task) => {
        if (!task) {
          return;
        }
        this.calculateQuorum(task);
        this.setState({taskDetails: task});
        this.getTaskHistory();
        if (task.acceptanceCount >= (task.quorum -1)) {
          this.setState({isApproveButtonVisible: true});
        } else {
          this.setState({isSubmitForReviewButtonVisible: true, isApproveButtonVisible: false});
        }
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
      });

  }

  calculateQuorum(task) {
    task.acceptanceCount = 0;
    task.reviewers.map((rev) => {
      if (rev.status === 'approved') {
        task.acceptanceCount += 1;
      }
    });
  }

  toggleSubmitForReview() {
    this.setState({isSubmitForReviewModalOpen: !this.state.isSubmitForReviewModalOpen, showQuorumFullMessageModal: false});
  }

  toggleSubmitForFurtherReview() {
    this.setState({showQuorumFullMessageModal: !this.state.showQuorumFullMessageModal});
    if (!this.state.showQuorumFullMessageModal) {
      this.setState({isSubmitButtonLocked: false, isApproveButtonLocked: false});
    }
  }
  onChangeReviewerClick() {
    this.setState({isSubmitForReviewModalOpen: true, isChangeReviewer: true,
      submitModalTitle: 'Change Reviewer'});
  }

  toggleRejectModal() {
    this.setState({rejectModal: !this.state.rejectModal, comment: ''});
    if (!this.state.rejectModal) {
      this.setState({isRejectButtonDisabled: false});
    }
  }

  getDepartmentList() {
    http.get(`${CONSTANTS.API_URL}/api/company/department`, { status: 'active' })
      .then((department) => {
        this.setState({departmentList: department, selectedDepartmentID: department[0]._id});
        if (department.length) {
          this.getUserList();
        }
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

  getAllUsers() {
    return http.get(`${CONSTANTS.API_URL}/api/user`, {noLimit: 'noLimit'})
      .then((allUsers) => {
        this.setState({allUsers});
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
      });
  }

  getTaskHistory() {
    this.setAuthorName(this.state.taskDetails.authorID);
    return http.get(`${CONSTANTS.API_URL}/api/object/${this.state.taskDetails._id}/history`, {objectType: 'task'})
      .then((taskHistoryList) => {
        taskHistoryList.map((history) => {
          history.userName = this.getUserName(history.createdBy);
          history.departmentName = this.getDepartmentName(history.createdBy);

          if (history.changedAttribute === 'reviewer') {
            history.oldReviewerName = this.getUserName(history.oldValue);
            history.newReviewerName = this.getUserName(history.newValue);
          }
        });
        this.setState({taskHistoryList, isViewHistory: true});
      })
      .catch((HTTPException) => {
        this.setState({isViewHistory: false});
        console.error(HTTPException.message);
      });
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

  toggleHistoryModal() {
    this.setState({taskHistoryModal: !this.state.taskHistoryModal});
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

  submitForReview(e) {
    e.preventDefault();
    this.setState({isSubmitButtonLocked: true});
    startLoader();
    let url;
    let body = {
      departmentID: e.target.department.value,
      userID: e.target.reviewer.value
    };
    if (e.target.comment.value) {
      body.comment = e.target.comment.value;
    }

    if (this.state.paymentVoucherDetails.status === 'draft' || this.state.paymentVoucherDetails.status === 'rejected') {
      url = `${CONSTANTS.API_URL}/api/object/${this.state.paymentVoucherID}/submitforreview?objectType=paymentVoucher`;
      body.status = 'submittedforreview';
    } else {
      url = `${CONSTANTS.API_URL}/api/task/${this.state.paymentVoucherDetails.taskID}/changeStatus`;
      body.decision = 'approved';
    }

    http.put(url, body)
      .then(() => {
        stopLoader();
        new Toast('Payment Voucher submitted successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.toggleReview();
        this.setState({isSubmitButtonLocked: false});
        this.getPaymentVoucherHistory();
        this.getPaymentVoucherDetails();
      })
      .catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        this.setState({isSubmitButtonLocked: false});
        console.error(HTTPException.message);
      });
  }

  approvePaymentVoucher(e) {
    e.preventDefault();
    let confirmMsg = confirm("Are you sure you want to approve this payment voucher?");
    if (confirmMsg) {
      startLoader();
      this.setState({isApproveButtonLocked: true});
      http.put(`${CONSTANTS.API_URL}/api/task/${this.state.paymentVoucherDetails.taskID}/changeStatus`, {decision: 'approved'})
        .then(() => {
          stopLoader();
          new Toast('Payment Voucher approved successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          this.toggleSubmitForFurtherReview();
          this.setState({isApproveButtonLocked: false});
          // this.getPaymentVoucherDetails();
          route("/tasks/all/underreview");
        })
        .catch((HTTPException) => {
          stopLoader();
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
          this.setState({isApproveButtonLocked: false});
          console.error(HTTPException.message);
        });
    }
  }

  rejectPaymentVoucher(e) {
    e.preventDefault();
    /*
      T1661 - Space is accepted while rejecting the billform or payment voucher.
      Developer - Arvind Shinde
      Date - 24/08/2018
    */
    if (!(e.target.comment.value.trim())) {
      return new Toast("Comment can not be empty", Toast.TYPE_ERROR, Toast.TIME_LONG);
    }
    let confirmMsg = confirm("Are you sure you want to reject this payment voucher?");
    if (confirmMsg) {
      startLoader();
      this.setState({isRejectButtonDisabled: true});
      http.put(`${CONSTANTS.API_URL}/api/task/${this.state.paymentVoucherDetails.taskID}/changeStatus`,
        {decision: 'rejected', comment: e.target.comment.value})
        .then(() => {
          stopLoader();
          new Toast('Payment Voucher rejected successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          this.toggleRejectModal();
          this.setState({isRejectButtonDisabled: false});
          // this.getPaymentVoucherDetails();
          route("/tasks/all/underreview");
        })
        .catch((HTTPException) => {
          stopLoader();
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
          this.setState({isRejectButtonDisabled: false});
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

  toggleReview() {
    // T1583 - Response of reviewer is taking too long time on submit for review modal
    // Developer - Shrutika Khot
    // Date - 02/08/18
    // Comment - isEnableReviewerDropdown flag changed to false
    this.setState({isSubmitForReviewModalOpen: !this.state.isSubmitForReviewModalOpen,
      isEnableReviewerDropdown: false});
    this.setState({reviewer: '', department: '', comment: ''});
  }

  navigateToSubComponent(e) {
    this.setState({
      displayViewName: e.target.value
    });
  }

  togglePaymentVoucherHistory() {
    this.setState({paymentVoucherHistoryModal: !this.state.paymentVoucherHistoryModal});

    if (this.state.paymentVoucherHistoryModal) {
      this.getPaymentVoucherHistory();
    }
  }

  getPaymentVoucherHistory() {
    startLoader();
    this.setState({
      loadingPaymentVoucherHistory: true
    });
    return http.get(`${CONSTANTS.API_URL}/api/object/${this.state.paymentVoucherID}/history`, {objectType: 'paymentVoucher'})
      .then((histories) => {
        histories.map((history) => {
          history.userName = this.getUserName(history.createdBy);
        });
        stopLoader();
        this.setState({histories, loadingPaymentVoucherHistory: false});
      }).catch((HTTPException) => {
        console.error(HTTPException);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        this.setState({
          loadingPaymentVoucherHistory: false
        });
      });
  }

  markAsPaid() {
    let confirmMsg = confirm('The status of payment voucher will be changed to PAID along with its associated '+this.state.billFormDisplayName+' and'+
    ' all bills. Are you sure you want to mark this payment voucher as PAID?');
    if (!confirmMsg) return;
    startLoader();
    return http.put(`${CONSTANTS.API_URL}/api/${this.state.paymentVoucherDetails._id}/markaspaid`, {status: 'paid'})
      .then(() => {
        this.getPaymentVoucherDetails();
        this.getPaymentVoucherHistory();
        new Toast('payment voucher marked as PAID successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
        stopLoader();
      });
  }

  toggleMarkAsPaidModal() {
    this.setState({
      markAsPaid: !this.state.markAsPaid,
      receiptFile: null,
      receiptNumber: '',
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
    // T1581 - Too long time is taken to start the loader when billform is rejected from billform detail view
    // Developer - Shrutika Khot
    // Date - 02/08/18
    // Comment - Added startLoader()
    e.preventDefault();
    startLoader();
    if (e.target.paymentType.value === 'individual' || !e.target.receiptFile.files.length) {
      return this.callApiForPayVoucher(e);
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
            return this.callApiForPayVoucher(e, fileDetails);
          });
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  callApiForPayVoucher(e, file) {
    let body = {
      paymentType: e.target.paymentType.value
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
    return http.put(`${CONSTANTS.API_URL}/api/paymentvoucherpaid/${this.state.paymentVoucherDetails._id}`, body)
      .then(() => {
        if (file) {
          new Toast('File uploaded and Payment Voucher marked as paid successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        } else {
          new Toast('Payment Voucher marked as paid successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        }
        this.toggleMarkAsPaidModal();
        this.getPaymentVoucherDetails();
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  approvePaymentVoucherOfZeroQuorum() {
    let confirmMsg = confirm("Are you sure you want to approve this Payment Voucher?");
    if (!confirmMsg) return;
    // T1572 - Loader is not proper when payment voucher is approved from the list, hence 2 pop-ups are overlapped
    // Developer - shrutika Khot
    // date - 30/07/18
    // comment - Added startLoader();
    startLoader();
    return http.put(`${CONSTANTS.API_URL}/api/object/${this.state.paymentVoucherDetails._id}/approve?objectType=paymentVoucher`,
      {
        status: 'approved'
      })
      .then(() => {
        new Toast('Payment Voucher approved successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.toggleSubmitForFurtherReview();
        this.getPaymentVoucherDetails();
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  componentDidMount() {
    this.setState({paymentVoucherID : this.props.matches.paymentVoucherID });
    startLoader();
    this.getAllUsers()
      .then(() => {
        this.getPaymentVoucherDetails();
        //this.getPaymentVoucherHistory();
        this.getDepartmentList();
      });
  }

  render({}, {paymentVoucherDetails, displayViewName, isClientAdmin, paymentVoucherQuorum}) {
    return (
      <div>
        <section class="box" style="min-height:3.5rem;">
          <div class="row">
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6 no-padding slide-wrapper">
              <span style="font-size: 1.2rem;"># {paymentVoucherDetails.number}</span>
              <span class="slide">
                <em style="padding: 5px; font-size: 1.2rem;" class="icon icon-thumbs-o-up" />
                <em style="padding: 5px; font-size: 1.2rem;" class="icon icon-thumbs-o-down" />
                <em style="padding: 5px; font-size: 1.2rem;" class="icon icon-thumbs-o-down" />
                <em style="padding: 5px; font-size: 1.2rem;" class="icon icon-thumbs-o-up" />
                <em style="padding: 5px; font-size: 1.2rem;" class="icon icon-thumbs-o-down" />
                <em style="padding: 5px; font-size: 1.2rem;" class="icon icon-thumbs-o-down" />

              </span>
            </div>
          </div>
        </section>
        <section class="box">
          <div class="row">
            <div class="column has-text-right">
              {
                (paymentVoucherDetails.status === 'draft' || paymentVoucherDetails.status === 'rejected') &&
                (paymentVoucherDetails.createdBy.toString() === this.state.loggedUserID.toString()) &&
                (
                  <span>
                    {
                      paymentVoucherQuorum > 0 &&
                      <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForReview.bind(this)}>
                        <span><em style="font-size:1em;color:limegreen" class="icon icon-thumbs-o-up"/></span>
                        <span style="display: block; line-height: 1;">Submit For Review</span></div>
                    }
                    {
                      paymentVoucherQuorum === 0 &&
                        <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForFurtherReview.bind(this)}>
                          <span><em style="font-size:1em;color:limegreen" class="icon icon-thumbs-o-up"/></span>
                          <span style="display: block; line-height: 1;">Approve</span></div>
                    }
                  </span>
                )
              }
              {
                paymentVoucherDetails.status === 'submittedforreview' && !isClientAdmin &&
                Object.keys(this.state.taskDetails).length > 0 &&
                (this.state.taskDetails.assignedUserID.toString() === this.state.loggedUserID.toString()) &&
                this.state.isSubmitForReviewButtonVisible && (
                  <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForReview.bind(this)}>
                    <span><em style="font-size:1em;color:limegreen" class="icon icon-thumbs-o-up"/></span>
                    <span style="display: block; line-height: 1;">Approve</span></div>
                )
              }
              {
                (paymentVoucherDetails.status === 'submittedforreview') && !isClientAdmin &&
                (paymentVoucherDetails.responsibleUserID.toString() === this.state.loggedUserID.toString()) &&
                (
                  <span>
                    {
                      this.state.isApproveButtonVisible &&
                        <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForFurtherReview.bind(this)}>
                          <span><em style="font-size:1em;color:limegreen" class="icon icon-thumbs-o-up"/></span>
                          <span style="display: block; line-height: 1;">Approve</span></div>
                    }
                    <span>
                      <div class="request-tile request-tile-clear" onClick={this.toggleRejectModal.bind(this)}>
                        <span><em style="font-size:1em;color:red" class="icon icon-thumbs-o-down"/></span>
                        <span style="display: block; line-height: 1;">Reject</span></div>
                    </span>
                  </span>
                )
              }
              {
                (paymentVoucherDetails.updatedBy && paymentVoucherDetails.updatedBy.toString() === this.state.loggedUserID.toString())
               && (paymentVoucherDetails.status === 'submittedforreview' && paymentVoucherDetails.status !== 'rejected') &&
                <div class="request-tile request-tile-clear" onClick={this.onChangeReviewerClick.bind(this)}>
                  <span><em style="font-size:1em;color:#808080" class="icon icon-pencil-square-o"/></span>
                  <span style="display: block; line-height: 1;">Change Reviewer</span></div>
              }
            </div>
          </div>
        </section>
        {displayViewName === "viewPaymentVoucherDetails" && (
          <section class="box">
            <div class="row">
              <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">
                <label style="width:100%;">Payment Voucher</label>
                <hr class="popup-hr" />
                <div class="column no-padding">
                  <div class={`table-responsive`}>
                    <table class="m-b-10 no-border-table">
                      <tbody>
                        {
                          paymentVoucherDetails.billFormNumber &&
                          <tr>
                            <td style="width: 130px;">{this.state.billFormDisplayName} No.</td>
                            <td>
                              <span><strong> {paymentVoucherDetails.billFormNumber || 'Not Available'}</strong></span>
                            </td>
                          </tr>
                        }
                        <tr>
                          <td style="width: 130px;">Amount</td>
                          <td>
                            <span><strong> {getFormattedAmount(paymentVoucherDetails.amount) || 'Not Available'}</strong></span>
                          </td>
                        </tr>
                        <tr>
                          <td style="width: 130px;">Date</td>
                          <td>
                            {
                              !paymentVoucherDetails.date && (
                                <span><strong> Not Available</strong></span>
                              )
                            }
                            {
                              paymentVoucherDetails.date && (
                                <span><strong> {formatDateTime(paymentVoucherDetails.date)}</strong></span>
                              )
                            }
                          </td>
                        </tr>
                        <tr>
                          <td style="width: 130px;">Amount In Words</td>
                          <td>
                            <span>
                              {
                                Object.keys(paymentVoucherDetails).length !== 0 && paymentVoucherDetails.convertedRupee &&
                                (<strong>
                                  {' रुपये ' + paymentVoucherDetails.convertedRupee }
                                  {
                                    paymentVoucherDetails.convertedPaise &&
                                    ' आणि पैसे ' +paymentVoucherDetails.convertedPaise
                                  }
                                  {' '}फक्त
                                </strong>) || 'Not Available'
                              }
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="width: 130px;">Payment Mode</td>
                          <td>
                            <span><strong> {paymentVoucherDetails.paymentMode || 'Not Available'}</strong></span>
                          </td>
                        </tr>
                        <tr>
                          <td style="width: 130px;">Payment Mode Number</td>
                          <td>
                            <span><strong> {paymentVoucherDetails.paymentModeNumber || 'Not Available'}</strong></span>
                          </td>
                        </tr>
                        {
                          paymentVoucherDetails.paymentInstrumentDate &&
                          <tr>
                            <td style="width: 130px;">Payment Instrument Date</td>
                            <td>
                              <span><strong>{paymentVoucherDetails.paymentInstrumentDate ? formatDateTime(paymentVoucherDetails.paymentInstrumentDate): 'Not Available'}
                              </strong></span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <label style="width:100%;">Task Overview</label>
                <hr class="popup-hr" />
                <div class="no-padding">
                  <div class={`table-responsive`}>
                    {
                      !this.state.taskHistoryList.length && (
                        <span class="button-margin-left">No History Found</span>
                      )
                    }
                    {
                      this.state.isViewHistory &&
                      <table>
                        <thead>
                          <tr>
                            <th>Responsible User</th>
                            <th>Action</th>
                            <th>Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            this.state.taskHistoryList.map((row) => (
                              <tr>
                                <td>{row.userName}<br /><i>({row.departmentName})</i></td>
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
                                  <br />
                                  <i>
                                  (on {formatDateTime(row.createdAt, true)})
                                  </i>
                                </td>
                                <td>{row.comment || '-'}</td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {displayViewName !== "viewPaymentVoucherDetails" && (
          <div>
            {/*displayViewName === "viewPaymentVoucherHistory" && (<PaymentVoucherHistory />)*/}
            {/*displayViewName === "viewPaymentVoucherPreview" && (<PaymentVoucherPreview />)*/}
          </div>
        )}
        {
          this.state.isSubmitForReviewModalOpen && (
            <Modal title="Submit For Review" modalSize="is-medium" onClose={this.toggleReview.bind(this)}>
              <form name="submitForReviewForm" onSubmit={this.submitForReview.bind(this)}>
                <ModalBody>
                  {
                    this.state.paymentVoucherDetails.status === 'submittedforreview' &&
                      <div class="row">
                        <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                          <strong>{paymentVoucherQuorum}</strong> approvals are mandatory to process payment of the Payment Voucher.
                          <br />
                          {
                            this.state.taskDetails.acceptanceCount > 0 &&
                            <span>
                              {
                                this.state.taskDetails.acceptanceCount === 1 &&
                                <span>
                                  <strong>{this.state.taskDetails.acceptanceCount}</strong> reviewer has already approved the Payment Voucher.
                                </span>
                              }
                              {
                                this.state.taskDetails.acceptanceCount !== 1 &&
                                <span>
                                  <strong>{this.state.taskDetails.acceptanceCount}</strong> reviewers have already approved the Payment Voucher.
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
                    <div class="col-xs-12 col-sm-12 col-md-6 col-lg-6 select">
                      <select name='department' value={this.state.department} onInput={linkState(this, 'department')}
                        required onChange={this.loadUsers.bind(this)}>
                        <option value='' selected>Select Department</option>
                        {
                          this.state.departmentList.map((list, index) =>
                            ( <option value={list._id} key={index}>{list.displayName}</option>))
                        }
                      </select>
                    </div>
                    <div class="col-xs-12 col-sm-12 col-md-6 col-lg-6 select">
                      <select name='reviewer' disabled={this.state.isEnableReviewerDropdown === false} value={this.state.reviewer} onInput={linkState(this, 'reviewer')} required>
                        <option value='' selected>Select Reviewer</option>
                        {
                          this.state.userList.map((list, index) =>
                            ( <option value={list._id} key={index}>{list.displayName}</option>))
                        }
                      </select>
                    </div>
                  </div>
                  <div class="row m-t-10">
                    <div class="col-xs-12 col-sm-12 col-md-6 col-lg-6">
                      <textarea value={this.state.comment} onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button class="button-small" disabled={this.state.isSubmitButtonLocked} type="submit">Submit</button>
                </ModalFooter>
              </form>
            </Modal>
          )
        }
        {
          this.state.showQuorumFullMessageModal &&
            <Modal title="Submit For Further Review" modalSize="is-medium" onClose={this.toggleSubmitForFurtherReview.bind(this)}>
              <form name="submitForFurtherReview" onSubmit={this.approvePaymentVoucher.bind(this)}>
                <ModalBody>
                  {
                    paymentVoucherQuorum !== 0 &&
                    <p>
                    Minimum review number for this payment voucher is satisfied. If you want to send for another review,
                     click on 'Submit', else click on 'Approve' to approve this payment voucher
                    </p>
                  }
                  {
                    paymentVoucherQuorum === 0 &&
                    <p>
                    This action will approve the payment voucher, however if you want to send it for review
                    click on 'Submit' button, else click on 'Approve' button.
                    </p>
                  }
                </ModalBody>
                <ModalFooter>
                  <button type="button" class="button-small button-margin-left" onClick={this.toggleSubmitForReview.bind(this)}>Submit</button>
                  {
                    paymentVoucherQuorum !== 0 &&
                  <button type="submit" class="button-small button-margin-left" disabled={this.state.isApproveButtonLocked}>Approve</button>
                  }
                  {
                    paymentVoucherQuorum === 0 &&
                    <button type="button" class="button-small button-margin-left" onClick={this.approvePaymentVoucherOfZeroQuorum.bind(this)}>Approve</button>
                  }
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.rejectModal &&
            <Modal title="Reject Payment Voucher" modalSize="is-medium" onClose={this.toggleRejectModal.bind(this)}>
              <form name="rejectReview" onSubmit={this.rejectPaymentVoucher.bind(this)}>
                <ModalBody>
                  <textarea type="text" value={this.state.comment} required
                    onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
                </ModalBody>
                <ModalFooter>
                  <button type="submit" class="button-small" disabled= {this.state.isRejectButtonDisabled} >Reject</button>
                </ModalFooter>
              </form>
            </Modal>
        }
      </div>
    );
  }
}
