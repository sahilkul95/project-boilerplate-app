import { h, Component } from 'preact';
import { Link } from 'preact-router';
import { Toast } from '../../lib/toastr';
import CONSTANTS from '../../lib/constants';
import { route } from 'preact-router';
// import BillFormPreview from '../../components/billformTMC';
import http from 'fetch-bb';
import { Modal, ModalBody, ModalFooter } from '../../components/modal';
import linkState from 'linkstate';
import { formatDateTime, startLoader, stopLoader, GetBudgetCategories, getFormattedAmount, getCommaSeparatedValues, GetDepartments, GetWards,
  GetZones } from '../../lib/utils';
import { AppStore } from '../../lib/store';
// import PDFSTYLE from '../../lib/pdfGenerationConfig';
// import LogoImage from './pmc_logo.png';
// let dataURL;

/*
  T1651 - APP - Bills+Billform+Payment Voucher is displayed in the dropdown of print preview even if payment voucher is not created.
  Developer - Arvind Shinde
  Date - 23/08/2018

  // All condition for Billform + Bills + Payment Voucher are update for Billform + Bills option
*/
export default class BillFormDetails extends Component {

  getDiscomDivisionNameWithNumber(id) {
    let nameWithNumber = '';
    this.state.discomDivisions.map((row) => {
      if (row._id === id){
        nameWithNumber = row.name + ' - ' + row.number;
      }
    });
    return nameWithNumber;
  }

  /* Unused code commented
     Developer : Pallavi
     Date : 06/07/2018
  */
  // viewBillFormDetails() {
  //   this.setState({displayViewName: 'viewBillFormDetails'});
  // }
  //
  // viewBillFormHistory() {
  //   this.setState({displayViewName: 'viewBillFormHistory'});
  // }
  //
  // viewBillFormPreview() {
  //   this.setState({displayViewName: 'viewBillFormPreview'});
  // }

  deleteBillForm() {
    let res;
    if (this.state.billForm.taskID && this.state.billForm.status === 'rejected') {
      res = confirm('This '+this.state.billFormDisplayName+' is under review cycle & have a task created for it.'+
      'If you choose to proceed, the task associated will also be deleted. Are you sure you want to void this '+this.state.billFormDisplayName+'?');
    } else {
      res = confirm('Are you sure you want to void this '+this.state.billFormDisplayName+' ?');
    }
    if (res) {
      startLoader();
      return http.del(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}`)
        .then(() => {
          stopLoader();
          new Toast(this.state.billFormDisplayName +' Voided successfully.', Toast.TYPE_DONE, Toast.TIME_NORMAL);
          return route('/billforms');
        })
        .catch((HTTPException) => {
          stopLoader();
          console.error(HTTPException);
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        });
    }
  }

  getBillFormDetail() {
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}`)
      .then((billForm) => {
        if (!billForm) {
          return new Toast('BillForm not found', Toast.TYPE_ERROR, Toast.TIME_LONG);
        }

        if (billForm.tharavKramankDate) {
          this.setState({tharavKramankDate: new Date(billForm.tharavKramankDate).toISOString().slice(0,10)});
        }
        if (billForm.tharavKramank) {
          this.setState({tharavKramank: billForm.tharavKramank});
        }
        if (billForm.isRTGSRequestCreated) {
          this.setState({isRTGSRequestCreated: billForm.isRTGSRequestCreated});
        }
        this.setState({ billForm });

        this.getBudgetDetails();
        this.setBillFormDetailObject(billForm);
        if (billForm.status !== 'draft') this.getBillFormHistory();
        this.prepareBudgetSummary();
        if (billForm && billForm.taskID) {
          http.get(`${CONSTANTS.API_URL}/api/task/${billForm.taskID}`, {taskObject: 'billForm' })
            .then((task) => {
              if (!task) {
                this.setState({isSubmitForReviewButtonVisible: false});
              } else {
                this.calculateQuorum(task);
                this.setState({taskDetails: task});
                this.setTaskDetailsObject(task);
                this.getTaskHistory();
                if (task.acceptanceCount >= (task.quorum -1)) {
                  //Condition to check if quorum is full
                  this.setState({isApproveButtonVisible: true});
                } else {
                  this.setState({isSubmitForReviewButtonVisible: true, isApproveButtonVisible: false});
                }
              }
            });
        }

        const otherDetails = [];
        otherDetails.push(
          http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/bills`)
        );
        otherDetails.push(
          http.get(`${CONSTANTS.API_URL}/api/company/department`, { id: billForm.departmentID})
        );
        otherDetails.push(
          http.get(`${CONSTANTS.API_URL}/api/company/ward`, { id: billForm.wardID})
        );
        otherDetails.push(
          http.get(`${CONSTANTS.API_URL}/api/company/discomDivision`, { id: billForm.discomDivisionID})
        );
        otherDetails.push(
          http.get(`${CONSTANTS.API_URL}/api/company/zone`, { id: billForm.zoneID})
        );
        return Promise.all(otherDetails)
          .then((details) => {
            this.setState({
              bills: details[0] || {},
              departments: details[1] || {},
              wards: details[2] || {},
              discomDivisions: details[3] || {},
              zones: details[4] || {}
            });
            // this.prepareBudgetSummary();
            this.getReceiptFile();
            const commaSeparatedDepartments = getCommaSeparatedValues(this.state.departments);
            const commaSeparatedWards = getCommaSeparatedValues(this.state.wards);
            const commaSeparatedZones = getCommaSeparatedValues(this.state.zones);
            const commaSeparatedDiscomDivisions = this.getCommaSeparatedDiscomDivisions(this.state.discomDivisions);
            this.setState({commaSeparatedDepartments, commaSeparatedWards, commaSeparatedZones, commaSeparatedDiscomDivisions});
            stopLoader();
          }).catch((HTTPException) => {
            console.error(HTTPException);
            new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
            stopLoader();
          });
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        stopLoader();
        if (HTTPException.statusCode === 404) return route('/tasks/all/underreview');
        // new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  /*
    T1514: 1st letter of BU is in lower case on billform detail view.
    Developer: Manohar
    Date: 20/10/18
    Comment: first convert DiscomDivisions Name in to lowercase then use capitalize css property
  */


  getCommaSeparatedDiscomDivisions(list) {
    let namesWithNumber = [];
    list.map((row) => {
      row ? namesWithNumber.push(row.name.toLowerCase() + ' - ' + row.number) : '';
    });
    namesWithNumber = namesWithNumber.join(', ');
    return namesWithNumber;
  }

  calculateQuorum(task) {
    task.acceptanceCount = 0;
    task.reviewers.map((rev) => {
      if (rev.status === 'approved') {
        task.acceptanceCount += 1;
      }
    });
  }

  approveBillForm(e) {
    e.preventDefault();
    let confirmMsg = confirm('Are you sure you want to approve this '+this.state.billFormDisplayName+'?');
    if (confirmMsg) {
      // T1572 - Loader is not proper when payment voucher is approved from the list, hence 2 pop-ups are overlapped
      // Developer - shrutika Khot
      // date - 30/07/18
      // comment - Added startLoader();
      startLoader();
      http.put(`${CONSTANTS.API_URL}/api/task/${this.state.billForm.taskID}/changeStatus`, {decision: 'approved'})
        .then(() => {
          if (this.state.billFormVisibilityMode === 'otherdepartment') {
            new Toast(this.state.billFormDisplayName+' approved & sent to next department successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
          } else {
            new Toast(this.state.billFormDisplayName+' approved successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          }
          this.toggleSubmitForFurtherReview();
          this.getBillFormDetail();
          this.getBillFormHistory();
        })
        .catch((HTTPException) => {
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
          console.error(HTTPException.message);
        });
    }
  }

  approveBillFormOfZeroQuorum() {
    let confirmMsg = confirm('Are you sure you want to approve this '+this.state.billFormDisplayName+'?');
    if (!confirmMsg) return;
    // T1572 - Loader is not proper when payment voucher is approved from the list, hence 2 pop-ups are overlapped
    // Developer - shrutika Khot
    // date - 30/07/18
    // comment - Added startLoader();
    startLoader();
    return http.put(`${CONSTANTS.API_URL}/api/object/${this.state.billForm._id}/approve?objectType=billForm`,
      {
        status: 'approved'
      })
      .then(() => {
        if (this.state.billFormVisibilityMode === 'otherdepartment') {
          new Toast(this.state.billFormDisplayName+' approved & sent to next department successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        } else {
          new Toast(this.state.billFormDisplayName+' approved successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        }
        this.toggleSubmitForFurtherReview();
        this.getBillFormDetail();
        this.getBillFormHistory();
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  rejectBillForm(e) {
    // T1581 - Too long time is taken to start the loader when billform is rejected from billform detail view
    // Developer - Shrutika Khot
    // Date - 02/08/18
    // Comment - Added startLoader()
    e.preventDefault();
    /*
      T1661 - Space is accepted while rejecting the billform or payment voucher.
      Developer - Arvind Shinde
      Date - 24/08/2018
    */
    if (!(e.target.comment.value.trim())) {
      return new Toast("Comment can not be empty", Toast.TYPE_ERROR, Toast.TIME_LONG);
    }
    let confirmMsg = confirm("Are you sure you want to reject this "+this.state.billFormDisplayName+" ?");
    if (confirmMsg) {
      startLoader();
      http.put(`${CONSTANTS.API_URL}/api/task/${this.state.billForm.taskID}/changeStatus`,
        {decision: 'rejected', comment: e.target.comment.value})
        .then(() => {
          new Toast(this.state.billFormDisplayName+' Rejected Successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
          this.toggleRejectModal();
          this.getBillFormDetail();
        })
        .catch((HTTPException) => {
          console.error(HTTPException.message);
        });
    }
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
      .then((historyDetails) => {
        historyDetails.map((history) => {
          history.userName = this.getUserName(history.createdBy);
          history.departmentName = this.getDepartmentName(history.createdBy);

          if (history.changedAttribute === 'reviewer') {
            history.oldReviewerName = this.getUserName(history.oldValue);
            history.newReviewerName = this.getUserName(history.newValue);
          }
        });
        this.setState({historyDetails, isViewHistory: true});
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

  getBudgetDetails() {
    return http.get(`${CONSTANTS.API_URL}/api/budget/${this.state.billForm.budgetID}`)
      .then((budgetDetails) => {
        this.setState({budgetDetails});
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        new Toast('Error while fetching budget details', Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
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
    // T1613 - Loader is not working properly when clicked on Submitted for review button.
    // Developer - shrutika Khot
    // date - 13/08/18
    // comment - Added startLoader() and stopLoader()
    startLoader();
    let url;
    let body = {
      departmentID: e.target.department.value,
      userID: e.target.reviewer.value
    };
    if (e.target.comment.value) {
      body.comment = e.target.comment.value;
    }

    if (this.state.billForm.status === 'draft' || this.state.billForm.status === 'rejected') {
      url = `${CONSTANTS.API_URL}/api/object/${this.state.billForm._id}/submitforreview?objectType=billForm`;
      body.status = 'submittedforreview';
    } else {
      url = `${CONSTANTS.API_URL}/api/task/${this.state.billForm.taskID}/changeStatus`;
      body.decision = 'approved';
    }

    http.put(url, body)
      .then(() => {
        new Toast(this.state.billFormDisplayName+' Submitted Successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.setState({showQuorumFullMessageModal: false, isSubmitForReviewModalOpen: false});
        this.getBillFormDetail();
        this.getBillFormHistory();
      })
      .catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  toggleSubmitForReview() {
    // T1583 - Response of reviewer is taking too long time on submit for review modal
    // Developer - Shrutika Khot
    // Date - 02/08/18
    // Comment - isEnableReviewerDropdown flag changed to false
    this.setState({showQuorumFullMessageModal: false, reviewer: '', department: '', comment: '', userList: []});
    this.setState({isSubmitForReviewModalOpen: !this.state.isSubmitForReviewModalOpen, isEnableReviewerDropdown: false});
  }

  toggleRequestChangesModal() {
    this.setState({requestChangesModal: !this.state.requestChangesModal, comment: ''});
  }

  requestChanges(e) {
    e.preventDefault();
    let confirmMsg = confirm('Billform will be sent to owner for changes, are you sure?');
    if (confirmMsg) {
      http.put(`${CONSTANTS.API_URL}/api/billForm/${this.state.billForm._id}/requestChanges`,
        {
          status: 'rejected',
          comment: e.target.comment.value
        })
        .then(() => {
          this.setState({requestChangesModal: false});
          new Toast('Requested Changes for this billform', Toast.TYPE_DONE, Toast.TIME_LONG);
          route('/');
        })
        .catch((HTTPException) => {
          new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
          console.error(HTTPException.message);
        });
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

  toggleSubmitForFurtherReview() {
    this.setState({showQuorumFullMessageModal: !this.state.showQuorumFullMessageModal});
  }

  toggleRejectModal() {
    this.setState({rejectModal: !this.state.rejectModal, comment: ''});
  }
  onChangeReviewerClick() {
    this.setState({isSubmitForReviewModalOpen: true});
  }

  /* Unused code commented
     Developer : Pallavi
     Date : 06/07/2018
  */
  // navigateToSubComponent(e) {
  //   this.setState({
  //     displayViewName: e.target.value
  //   });
  //   if (this.state.displayViewName === 'printPreview') {
  //     this.togglePrintPreview();
  //   }
  // }

  togglePrintPreview(selectedDocument) {
    this.setState({
      // displayViewName: 'printPreview',
      isBillFormPreviewModalOpen: !this.state.isBillFormPreviewModalOpen,
      isHTMLBillResponseReceived: true,
      isHTMLBillFormResponseReceived: true,
      isDownloadAbstract: true,
      isDownloadAbstractTwo: true,
      isDownloadBudgetSummaryData: true,
      selectedPrintPreviewOption: (selectedDocument && typeof selectedDocument === 'string') ? selectedDocument : 'Only Billform'
    });

    if (this.state.isBillFormPreviewModalOpen) {
      /* T1480 : API for HTML template will be called according to the selected document, if selected. Default is getHTMLBillform()
         Developer : Pallavi
         Date : 13/07/2018
      */
      if (!selectedDocument || (selectedDocument && typeof selectedDocument !== 'string')) {
        startLoader();
        this.getHTMLBillform();
      } else {
        startLoader();
        if (this.state.selectedPrintPreviewOption === 'Only Billform') this.getHTMLBillform();
        if (this.state.selectedPrintPreviewOption === 'Only Abstract' && this.state.billForm.abstractID) this.getHTMLAbstract();
        if (this.state.selectedPrintPreviewOption === 'Only Abstract Version A' && this.state.billForm.abstractVersionAID) this.getHTMLAbstractVersionA();
        if (this.state.selectedPrintPreviewOption === 'Only Pmc Payment Voucher' && this.state.billForm.pmcPaymentVoucherID) this.getHTMLPmcPaymentVoucher();
        if (this.state.selectedPrintPreviewOption === 'Only Budget Summary' && this.state.billForm.budgetSummaryID) this.getHTMLBudgetSummary();
        if (this.state.selectedPrintPreviewOption === 'Only Demand Draft' && this.state.billForm.billFormDemandDraftID) this.getHTMLDemandDraft();
        if (this.state.selectedPrintPreviewOption === 'Only Abstract Two' && this.state.billForm.abstractTwoID) this.getHTMLAbstractTwo();
        if (this.state.selectedPrintPreviewOption === 'Application for RTGS/NEFT transaction' && this.state.billForm.isRTGSRequestCreated) this.getHTMLRTGS();
      }

      //   this.getHTMLBillform().then(()=> {
      //     if (this.state.billForm.abstractID) {
      //       this.getHTMLAbstract();
      //     }
      //     if (this.state.billForm.paymentVoucherID) {
      //       return http.get(`${CONSTANTS.API_URL}/api/paymentvoucher/${this.state.billForm.paymentVoucherID}`)
      //         .then((paymentVoucher) => {
      //           if (!paymentVoucher.isPaymentVoucherOffline){
      //             this.getHTMLPaymentVoucher();
      //             this.setState({checkNotOfflineVoucher:true});
      //           }
      //           else {
      //             stopLoader();
      //             this.setState({displayViewName: 'viewBillFormDetails'});
      //
      //           }
      //         })
      //         .catch((HTTPException) => {
      //           stopLoader();
      //           console.error(HTTPException);
      //           new Toast('Error while fetching Payment Voucher', Toast.TYPE_ERROR, Toast.TIME_LONG);
      //         });
      //     }
      //   });
      // });
    }
  }

  toggleBillFormHistory() {
    this.setState({billFormHistoryModal: !this.state.billFormHistoryModal});

    if (this.state.billFormHistoryModal) {
      this.getBillFormHistory();
    }
  }

  getHTMLBills() {
    this.setState({isHTMLBillResponseReceived: true});
    let promiseArray = [];
    this.state.bills.filter((bill) => {
      promiseArray.push(
        http.get(`${CONSTANTS.API_URL}/api/consumer/${bill.consumerID}/bill/${bill.year}/${bill.month}`)
      );
    });

    return Promise.all(promiseArray).then((response) => {
      this.setState({HTMLBills:response, isHTMLBillResponseReceived: false});
      stopLoader();
    }).catch((HTTPException) => {
      new Toast('Error while fetching bills.', Toast.TYPE_ERROR, Toast.TIME_LONG);
      console.error(HTTPException);
      this.setState({isHTMLBillResponseReceived: false});
      stopLoader();
    });
  }

  resizeIframe(e) {
    if (this.state.selectedPrintPreviewOption === 'Only Bills' ||
    (this.state.selectedPrintPreviewOption === 'Billform + Bills + Payment Voucher' || this.state.selectedPrintPreviewOption === 'Billform + Bills'))
    {
      let frame = Array.from(document.getElementsByClassName("billFrame"));
      frame.map((item) => {
        let  printButtonOnBill=Array.from(item.contentDocument.body.getElementsByClassName("printButtonContainer"));
        printButtonOnBill.map((element) => {
          element.style.display="none";
        });
      });
    }
    e.target.style.height = 0;
    e.target.style.height = e.target.contentWindow.document.body.scrollHeight + 10 + 'px';
    // e.target.style.transform = 'scale (0.91)';
  }

  getHTMLBillform() {
    this.setState({isHTMLBillFormResponseReceived: true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/billformTemplate`)
      .then((response) => {
        stopLoader();
        this.setState({HTMLBillform: response, isHTMLBillFormResponseReceived: false});
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching billform.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLBillFormResponseReceived: false});
      });
  }

  getHTMLAbstract() {
    this.setState({isHTMLAbstractResponseReceived: true, isDownloadAbstract:true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/abstractTemplate`)
      .then((response) => {
        this.setState({HTMLAbstract: response, isHTMLAbstractResponseReceived: false, isDownloadAbstract: false});
        stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching abstract.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLAbstractResponseReceived: false, isDownloadAbstract:false});
      });
  }

  getHTMLBudgetSummary() {
    this.setState({isHTMLBudgetSummaryResponseReceived: true, isDownloadBudgetSummaryData:true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/budgetSummaryTemplate`)
      .then((response) => {
        this.setState({HTMLBudgetSummary: response, isHTMLBudgetSummaryResponseReceived: false, isDownloadBudgetSummaryData: false});
        stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching budget summary.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLBudgetSummaryResponseReceived: false, isDownloadBudgetSummaryData:false});
      });
  }

  getHTMLAbstractVersionA() {
    this.setState({isHTMLAbstractVersionAResponseReceived: true, isDownloadAbstract:true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/abstractVersionATemplate`)
      .then((response) => {
        this.setState({HTMLAbstractVersionA: response, isHTMLAbstractVersionAResponseReceived: false, isDownloadAbstract: false});
        stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching abstract.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLAbstractVersionAResponseReceived: false, isDownloadAbstract:false});
      });
  }

  getHTMLPmcPaymentVoucher() {
    this.setState({isHTMLPmcPaymentVoucherResponseReceived: true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/pmcPaymentVoucherTemplate`)
      .then((response) => {
        stopLoader();
        this.setState({HTMLPmcPaymentVoucher: response, isHTMLPmcPaymentVoucherResponseReceived: false});
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching PMC Payment Voucher.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLPmcPaymentVoucherResponseReceived: false});
      });
  }
  getHTMLDemandDraft() {
    this.setState({isHTMLDemandDraftResponseReceived: true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/demandDraftTemplate`)
      .then((response) => {
        stopLoader();
        this.setState({HTMLDemandDraft: response, isHTMLDemandDraftResponseReceived: false});
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching Demand Draft.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLDemandDraftResponseReceived: false});
      });
  }

  getHTMLAbstractTwo() {

    this.setState({abstractTwoLoader: true, isDownloadAbstractTwo:true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/abstractTwoTemplate`)
      .then((response) => {
        this.setState({HTMLAbstractTwo: response, abstractTwoLoader: false, isDownloadAbstractTwo: false});
        stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching abstract II.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({abstractTwoLoader: false, isDownloadAbstractTwo:false});
      });
  }
  //T1387: RTGS/NEFT
  //developer: samruddhi
  //date: 30/6/2018
  getHTMLRTGS() {
    this.setState({isHTMLRTGSResponseReceived: true});
    return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/RTGSTemplate`)
      .then((response) => {
        stopLoader();
        this.setState({HTMLRTGS: response, isHTMLRTGSResponseReceived: false});
      }).catch((HTTPException) => {
        stopLoader();
        new Toast('Error while fetching RTGS.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException);
        this.setState({isHTMLRTGSResponseReceived: false});
      });
  }

  getHTMLPaymentVoucher() {
    this.setState({isHTMLPaymentVoucherResponseReceived: true});
    return  http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/paymentVoucherTemplate`)
      .then((response) => {
        stopLoader();
        this.setState({HTMLPaymentVoucher: response, isHTMLPaymentVoucherResponseReceived: false});
      }).catch((HTTPException) => {
        stopLoader();
        console.error(HTTPException);
        this.setState({isHTMLPaymentVoucherResponseReceived: false});
        return new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  submit(e) {
    e.preventDefault();
  }

  loadPrintPreview(e) {
    e.preventDefault();
    this.setState({selectedPrintPreviewOption: e.target.value,
      isHTMLBillFormResponseReceived: true,
      isHTMLBillResponseReceived: true,
      isHTMLPaymentVoucherResponseReceived: true,
      isHTMLAbstractResponseReceived: true,
      isHTMLBudgetSummaryResponseReceived: true,
      isHTMLAbstractVersionAResponseReceived: true,
      isHTMLPmcPaymentVoucherResponseReceived: true,
      isHTMLDemandDraftResponseReceived: true,
      abstractTwoLoader: true,
      isHTMLRTGSResponseReceived: true,
      HTMLBills: [],
      HTMLBillform: {htmlBillform: []},
      HTMLPaymentVoucher: {htmlPaymentVoucher: []},
      HTMLAbstract: {
        htmlAbstract: []
      },
      HTMLBudgetSummary: {
        htmlBudgetSummary: []
      },
      HTMLAbstractVersionA: {
        htmlAbstractVersionA: []
      },
      HTMLPmcPaymentVoucher: {
        htmlPmcPaymentVoucher: []
      },
      HTMLDemandDraft: {
        htmlDemandDraft: []
      },
      HTMLRTGS: {
        htmlRTGS: []
      },
      HTMLAbstractTwo: {
        htmlAbstract: []
      }
    });
    startLoader();
    //if selected value in print preview matches condition then call api of selected template type
    if (e.target.value === 'Only Bills') this.getHTMLBills();
    if (e.target.value === 'Only Billform') this.getHTMLBillform();
    /*
      T1651 - APP - Bills+Billform+Payment Voucher is displayed in the dropdown of print preview even if payment voucher is not created.
      Developer - Arvind Shinde
      Date - 23/08/2018
    */
    if (e.target.value === 'Billform + Bills + Payment Voucher' || e.target.value === 'Billform + Bills') this.getAllHTMLTemplate();
    if (e.target.value === 'Only Abstract' && this.state.billForm.abstractID) this.getHTMLAbstract();
    if (e.target.value === 'Only Abstract Version A' && this.state.billForm.abstractVersionAID) this.getHTMLAbstractVersionA();
    if (e.target.value === 'Only Abstract Two' && this.state.billForm.abstractTwoID) this.getHTMLAbstractTwo();
    if (e.target.value === 'Only Pmc Payment Voucher' && this.state.billForm.pmcPaymentVoucherID) this.getHTMLPmcPaymentVoucher();
    if (e.target.value === 'Only Budget Summary' && this.state.billForm.budgetSummaryID) this.getHTMLBudgetSummary();
    if (e.target.value === 'Only Demand Draft' && this.state.billForm.billFormDemandDraftID) this.getHTMLDemandDraft();
    if (e.target.value === 'Application for RTGS/NEFT transaction' && this.state.billForm.isRTGSRequestCreated) this.getHTMLRTGS();
  }

  getAllHTMLTemplate() {
    let promiseArray = [];
    this.state.bills.filter((bill) => {
      promiseArray.push(
        http.get(`${CONSTANTS.API_URL}/api/consumer/${bill.consumerID}/bill/${bill.year}/${bill.month}`)
      );
    });

    Promise.all(promiseArray).then((response) => {
      this.setState({HTMLBills:response});
      http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/billformTemplate`)
        .then((response) => {
          this.setState({HTMLBillform: response , isHTMLBillFormResponseReceived: false});
          if (this.state.billForm.paymentVoucherID) {
            http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/paymentVoucherTemplate`)
              .then((response) => {
                stopLoader();
                this.setState({HTMLPaymentVoucher: response, isHTMLPaymentVoucherResponseReceived: false});
              });
          }
          stopLoader();
        });
    }).catch((HTTPException) => {
      new Toast('Error while fetching bills.', Toast.TYPE_ERROR, Toast.TIME_LONG);
      console.error(HTTPException);
      this.setState({isHTMLBillResponseReceived: false});
      stopLoader();
    });
  }

  printWindow() {
    // function for calling print method
    startLoader();
    // T1419: Allow template creations and print actions on bill form only when it is approved
    // Developer: samruddhi
    // Date: 10/7/2018
    if (((this.state.selectedPrintPreviewOption === 'Billform + Bills + Payment Voucher' || this.state.selectedPrintPreviewOption === 'Billform + Bills')
      || this.state.selectedPrintPreviewOption === 'Only Billform' ||
     this.state.selectedPrintPreviewOption === 'Only Bills' || this.state.selectedPrintPreviewOption === 'Only Budget Summary'
      || this.state.selectedPrintPreviewOption === 'Only Pmc Payment Voucher' || this.state.selectedPrintPreviewOption === 'Only Demand Draft') && this.state.billForm.status !== 'approved')
    {
      stopLoader();
      return new Toast('The document cannot be printed because '+ this.state.billFormDisplayName +' is not approved yet', Toast.TYPE_ERROR, Toast.TIME_LONG);
    }
    this.setState({
      isHTMLBillFormResponseReceived: true,
      isHTMLBillResponseReceived: true,
      isHTMLPaymentVoucherResponseReceived: true,
      isHTMLAbstractResponseReceived: true,
      isHTMLBudgetSummaryResponseReceived: true,
      isHTMLAbstractVersionAResponseReceived: true,
      isHTMLPmcPaymentVoucherResponseReceived: true,
      isHTMLDemandDraftResponseReceived: true,
      abstractTwoLoader: true,
      isHTMLRTGSResponseReceived: true
      // HTMLBills: [],
      // HTMLBillform: {htmlBillform: []},
      // HTMLPaymentVoucher: {htmlPaymentVoucher: []},
      // HTMLAbstract: {
      //   htmlAbstract: []
      // },
    });
    if (this.state.selectedPrintPreviewOption === 'Only Bills') this.getHTMLBills().then(() => {
      setTimeout(() => {
        this.printAll();
        stopLoader();
      }, 0);
    });
    if (this.state.selectedPrintPreviewOption === 'Only Billform') this.getHTMLBillform().then(() => {
      setTimeout(() => {
        this.printAll();
        stopLoader();
      }, 0);
    });
    if (this.state.selectedPrintPreviewOption === 'Only Budget Summary') this.getHTMLBudgetSummary().then(() => {
      setTimeout(() => {
        this.printAll();
        stopLoader();
      }, 0);
    });
    // if (this.state.selectedPrintPreviewOption === 'Only Abstract' && this.state.billForm.abstractID) this.getHTMLAbstract().then(() => {
    //   setTimeout(() => {
    //     this.printAll();
    //     stopLoader();
    //   }, 0);
    // });
    if (this.state.selectedPrintPreviewOption === 'Only Pmc Payment Voucher' && this.state.billForm.pmcPaymentVoucherID) this.getHTMLPmcPaymentVoucher().then(() => {
      setTimeout(() => {
        this.printAll();
        stopLoader();
      }, 0);
    });
    if (this.state.selectedPrintPreviewOption === 'Only Demand Draft' && this.state.billForm.billFormDemandDraftID) this.getHTMLDemandDraft().then(() => {
      setTimeout(() => {
        this.printAll();
        stopLoader();
      }, 0);
    });
    if (this.state.selectedPrintPreviewOption === 'Application for RTGS/NEFT transaction' && this.state.billForm.isRTGSRequestCreated &&
      this.state.billForm.status === 'approved') this.getHTMLRTGS().then(() => {
      setTimeout(() => {
        this.printAll();
        stopLoader();
      }, 0);
    });
    if (this.state.selectedPrintPreviewOption === 'Billform + Bills + Payment Voucher' || this.state.selectedPrintPreviewOption === 'Billform + Bills') this.getAllHTMLTemplatePrint();
  }

  getAllHTMLTemplatePrint() {
    let promiseArray = [];
    this.state.bills.filter((bill) => {
      promiseArray.push(
        http.get(`${CONSTANTS.API_URL}/api/consumer/${bill.consumerID}/bill/${bill.year}/${bill.month}`)
      );
    });

    Promise.all(promiseArray).then((response) => {
      this.setState({HTMLBills:response});
      http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/billformTemplate`)
        .then((response) => {
          this.setState({HTMLBillform: response, isHTMLBillFormResponseReceived: false});
          if (this.state.billForm.paymentVoucherID) {
            http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/paymentVoucherTemplate`)
              .then((response) => {
                stopLoader();
                this.setState({HTMLPaymentVoucher: response, isHTMLPaymentVoucherResponseReceived: false});
              });
          } else {
            this.setState({isHTMLPaymentVoucherResponseReceived: false});
            stopLoader();
          }
          setTimeout(() => {
            this.printAll();
            stopLoader();
          }, 0);
        });
    }).catch((HTTPException) => {
      new Toast('Error while fetching bills.', Toast.TYPE_ERROR, Toast.TIME_LONG);
      console.error(HTTPException);
      this.setState({isHTMLBillResponseReceived: false});
    });
  }

  printAll() {
    let printContents = document.getElementById('printableArea').innerHTML;
    let w = window.open();

    w.document.write(printContents);
    w.document.close();
    w.focus();
    w.onload = function() {
      w.print();
      w.close();
    };
    // setTimeout(() => {
    //   w.print();
    //   w.close();
    // }, 100);

    return true;
  }

  getBillFormHistory() {
    // startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/object/${this.props.matches.billFormID}/history`, {objectType: 'billForm'})
      .then((histories) => {
        histories.map((history) => {
          history.userName = this.getUserName(history.createdBy);
        });
        // stopLoader();
        this.setState({histories});
      }).catch((HTTPException) => {
        // stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  toggleOfflineProcessingModal() {
    this.setState({isOfflinePaymentVoucherModal: !this.state.isOfflinePaymentVoucherModal,
      paymentVoucherNumber: '', amount: '', date: '', paymentVoucherFile: '',paymentInstrumentDate:''});
  }

  closeModal() {
    this.setState({isOfflinePaymentVoucherModal: false, paymentVoucherNumber: '', amount: '', date: '',
      paymentVoucherFile: '', paymentInstrumentFile: '',paymentMode:'', paymentModeNumber: '', isButtonLocked: false});
  }

  createPaymentVoucherOffline(e) {
    e.preventDefault();
    startLoader();
    this.setState({isButtonLocked: true});
    let body = {
      billFormID: this.state.billForm._id,
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
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  uploadPaymentVoucherFile(fileObj, e, body) {
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
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
        this.setState({isButtonLocked: false});
      });
  }

  callApiPaymentVoucherOffline(body, file) {
    if (file) {
      body.paymentVoucherFileID = file._id;
    }
    return http.post(`${CONSTANTS.API_URL}/api/paymentVoucher/processOffline`, body)
      .then(() => {
        new Toast('File uploaded and Payment Voucher created successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.closeModal();
        this.getBillFormDetail();
      })
      .catch((HTTPException) => {
        stopLoader();
        console.error(HTTPException.message);
        /*T1297
          developer: samruddhi
          date: 6/7/2018
          error msg added*/
        if (HTTPException.statusCode === 400) {
          //If Joi error
          new Toast('Empty Fields are not accepted.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        } else if (HTTPException.message.includes('duplicate')) {
          new Toast('Could not create Payment Voucher, Payment Voucher you are trying to create already exist.', Toast.TYPE_ERROR, Toast.TIME_LONG);
        } else new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  onPaymentModeSelection(e) {
    this.setState({paymentModeNumber: '', paymentMode: e.target.value,isPaymentModeSelected: true, paymentInstrumentDate: null});
    document.getElementById('createPaymentVoucherOffline').elements.paymentInstrumentDate.value = null;
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
  createAbstract() {
    let confirmMsg = confirm('Are you sure you want to proceed for abstract creation for this '+ this.state.billFormDisplayName +'?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createAbstract`)
      .then(() => {
        new Toast(this.state.billFormDisplayName + ' abstract created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  createAbstractVersionA() {
    let confirmMsg = confirm('Are you sure you want to proceed for abstract creation for this '+ this.state.billFormDisplayName+' ?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createAbstractVersionA`)
      .then(() => {
        new Toast(this.state.billFormDisplayName+' abstract created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  createPmcPaymentVoucher() {
    let confirmMsg = confirm('Are you sure you want to proceed for pmc payment voucher creation for this '+this.state.billFormDisplayName+' ?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createPmcPaymentVoucher`)
      .then(() => {
        new Toast('PMC Payment Voucher created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  createDemandDraft() {
    let confirmMsg = confirm('Are you sure you want to proceed for Demand draft creation for this '+this.state.billFormDisplayName+' ?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createBillformDemandDraft`)
      .then(() => {
        new Toast('Demand Draft created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  createAbstractTwo() {
    let confirmMsg = confirm('Are you sure you want to proceed for Abstract II creation for this '+this.state.billFormDisplayName+' ?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createAbstractTwo`)
      .then(() => {
        new Toast('Abstract II created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  createRTGSRequest() {
    let confirmMsg = confirm('Are you sure you want to proceed for RTGS Request creation for this '+this.state.billFormDisplayName+' ?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createRTGS`)
      .then((billForm) => {
        this.setState({isRTGSRequestCreated: billForm.isRTGSRequestCreated});
        new Toast('RTGS request created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  createBudgetSummary() {
    let confirmMsg = confirm('Are you sure you want to proceed for Budget summary creation for this '+this.state.billFormDisplayName+'?');
    if (!confirmMsg) return;
    startLoader();
    return http.post(`${CONSTANTS.API_URL}/api/billform/${this.props.matches.billFormID}/createBudgetSummary`)
      .then(() => {
        new Toast('Budget summary created successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getBillFormDetail();
        //stopLoader();
      }).catch((HTTPException) => {
        stopLoader();
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  componentWillMount() {
    this.state = {
      tharavKramank: 0,
      tharavKramankDate: null,
      checkNotOfflineVoucher: false,
      budgetSummary: {
        budgetCategoryNamesArray: [],
        data: [
          {
            heading: 'No. of Bills',
            counts: []
          }, {
            heading: 'Sanctioned Amount',
            sanctionedAmounts: []
          }, {
            heading: 'Consumed Amount',
            consumedAmounts: []
          }, {
            heading: 'Balance',
            balance: []
          }
        ]
      },
      amount:{
        securityDepositDemanded: 0,
        promptPaymentAmount: 0,
        billDueAmount:  0,
        latePaymentAmount: 0,
        totalCurrentBill: 0
      },
      isOtherSelected: false,
      billType:'',
      budgetDetails: '',
      // displayViewName: '',
      billForm: {},
      billFormDetails: {
        departments:[],
        wards:[],
        zones:[]
      },
      bills: [],
      billFormID: '',
      departments: [],
      wards: [],
      zones: [],
      discomDivisions: [],
      isApproveButtonVisible: false,
      isRejectButtonVisible: false,
      isSubmitForReviewButtonVisible: false,
      taskDetails: {updatedBy: '', assignedUserID: ''},
      historyDetails: [],
      taskHistoryModal: false,
      allUsers: [],
      allWards: [],
      zoneList: [],
      allDepartments: [],
      department: '',
      reviewer: '',
      comment: '',
      isSubmitForReviewModalOpen: false,
      showQuorumFullMessageModal: false,
      departmentList: [],
      userList: [],
      selectedDepartmentID: '',
      rejectModal: false,
      statuses: {
        draft: 'Draft',
        submittedforreview: 'Submitted For Review',
        rejected: 'Rejected',
        approved: 'Approved',
        paid: 'Paid',
        underreview: 'Under Review',
        accepted: 'Accepted',
        closed: 'Closed',
        underProcessBBPS: 'Payment Under Process'
      },
      historyStatuses: {
        underreview: 'Submitted for review',
        approved: 'Approved',
        rejected: 'Rejected',
        accepted: 'Approved'
      },
      isBillFormPreviewModalOpen: false,
      /*
        T1651 - APP - Bills+Billform+Payment Voucher is displayed in the dropdown of print preview even if payment voucher is not created.
        Developer - Arvind Shinde
        Date - 23/08/2018
      */
      printPreviewOptionsList: ['Only Billform', 'Only Bills', 'Billform + Bills'],
      selectedPrintPreviewOption: 'Only Billform',
      HTMLBills: [],
      HTMLBillform: {htmlBillform: []},
      HTMLPaymentVoucher: {htmlPaymentVoucher: []},
      HTMLAbstract: {
        htmlAbstract: []
      },
      HTMLBudgetSummary: {
        htmlBudgetSummary: []
      },
      HTMLAbstractVersionA: {
        htmlAbstractVersionA: []
      },
      HTMLPmcPaymentVoucher: {
        htmlPmcPaymentVoucher: []
      },
      HTMLDemandDraft: {
        htmlDemandDraft: []
      },
      HTMLAbstractTwo: {
        htmlAbstract:[]
      },
      HTMLRTGS: {
        htmlRTGS: []
      },
      loggedUserID: '',
      isViewHistory: false,
      loggedUserDepartmentIDs: [],
      isOpenEditBillModal: false,
      isOpenEditTharavKramankModal: false,
      billId: '',
      payableAmount: 0,
      markAsPaid : false,
      receiptFile : '',
      receiptNumber: '',
      billID: '',
      isButtonLocked : '',
      budgetSummaryArray: [],
      budgetCategoryList: [],
      connectionTypes: {
        lt: 'LT',
        ht: 'HT'
      },
      isHTMLBillResponseReceived: false,
      isHTMLBillFormResponseReceived: false,
      isHTMLPaymentVoucherResponseReceived: false,
      paymentVoucherNumber: '',
      date: '',
      paymentInstrumentDate:'',
      paymentVoucherFile: '',
      paymentInstrumentFile: '',
      isOfflinePaymentVoucherModal: false,
      paymentMode: '',
      paymentModeNumber: '',
      isHTMLAbstractResponseReceived: false,
      isHTMLBudgetSummaryResponseReceived: false,
      isHTMLAbstractVersionAResponseReceived: false,
      isHTMLPmcPaymentVoucherResponseReceived: false,
      isHTMLDemandDraftResponseReceived: false,
      abstractTwoLoader: false,
      isHTMLRTGSResponseReceived: false,
      histories: [],
      billFormHistoryModal: false,
      totalBillsToBePaid: 0,
      totalAmountToBePaid: 0,
      userInfo: AppStore.get('userinfo'),
      isAbstractCreationRequired: false,
      isAbstractTwoCreationRequired: false,
      editPayableAmountButtonLocked: false,
      isReceiptModalOpen: false,
      abstractData: {},
      budgetSummaryData: {},
      isDownloadAbstract: false,
      isDownloadAbstractTwo: false,
      isDownloadBudgetSummaryData: false,
      isBillFormBudgetSummaryCreationRequired: false,
      isPmcPaymentVoucherCreationRequired: false,
      isDemandDraftCreationRequired: false,
      isRTGSRequestRequired: false,
      isRTGSRequestCreated: false,
      // T1435: User is unable to reject the approved bill form when payment voucher required option is false
      // Developer: samruddhi
      // Date: 10/7/2018
      nextDepartmentAfterBillformTaskApproval: false,
      isMultipleBUModalOpen: false,
      isPossibleActionsModalOpen: false,
      isEnableReviewerDropdown: false,
      bill: {},
      isShowBillFailureReason: false,
      billFailureReason: ''
    };

    const userInfo = AppStore.get('userinfo');
    let deptIDArray = userInfo.department;
    deptIDArray.map((dept) => {
      this.setState({loggedUserDepartmentIDs: this.state.loggedUserDepartmentIDs.concat(dept._id)});
    });
    this.setState({ billFormID : this.props.matches.billFormID, loggedUserID: userInfo.id, isClientAdmin: userInfo.isClientAdmin,
      organizationCreationMethod: userInfo.company.metadata.organizationCreationMethod,
      billFormVisibilityMode: userInfo.company.metadata.approvedBillformVisibilityMode,
      billFormQuorum: userInfo.company.metadata.billFormQuorum,
      isPaymentVoucherCreationRequired: userInfo.company.metadata.isPaymentVoucherCreationRequired,
      isAbstractCreationRequired: userInfo.company.metadata.isAbstractCreationRequired,
      isAbstractTwoCreationRequired: userInfo.company.metadata.isAbstractTwoCreationRequired,
      isPmcPaymentVoucherCreationRequired: userInfo.company.metadata.isPmcPaymentVoucherCreationRequired,
      isBillFormBudgetSummaryCreationRequired: userInfo.company.metadata.isBillFormBudgetSummaryCreationRequired,
      isDemandDraftCreationRequired: userInfo.company.metadata.isDemandDraftCreationRequired,
      isRTGSRequestRequired: userInfo.company.metadata.isRTGSRequestRequired,
      /*
      T1498: Display Name for bill form
      Developer: Samruddhi
      Date: 17/7/2018
      */
      billFormDisplayName: userInfo.company.billFormDisplayName,
      rejectModalTitle: 'Reject ' + userInfo.company.billFormDisplayName,
      billformHistoryModalTitle: userInfo.company.billFormDisplayName + ' History',
      billformTaskHistoryModel: userInfo.company.billFormDisplayName + ' Task History',
      // T1435: User is unable to reject the approved bill form when payment voucher required option is false
      // Developer: samruddhi
      // Date: 10/7/2018
      nextDepartmentAfterBillformTaskApproval: userInfo.company.metadata.nextDepartmentAfterBillformTaskApproval
    });
  }

  componentDidMount() {
    startLoader();
    this.getAllUsers()
      .then(() => {
        this.getDepartmentList();
        this.getBillFormDetail();
        // this.getBillFormHistory();
      });
    GetBudgetCategories().then((response) => this.setState({budgetCategoryList: response}));
    if (this.state.organizationCreationMethod === 'wardwise' || this.state.organizationCreationMethod === 'zonewardwise')
    {
      GetWards().then((wards) => this.setState({allWards: wards}));
    }
    if (this.state.organizationCreationMethod === 'zonewise' || this.state.organizationCreationMethod === 'zonewardwise'){
      GetZones().then((zones) => this.setState({zoneList: zones}));
    }
    GetDepartments().then((departments) => this.setState({allDepartments: departments}));
  }

  //previous budget summary display logic
  // prepareBudgetSummaryArray() {
  //   let categoriesOnBillform = this.state.billForm.allocatedBudgetCategories;
  //   const categoryIDs = categoriesOnBillform.map((category) => {return category.budgetCategoryID;});
  //
  //   return http.get(`${CONSTANTS.API_URL}/api/budget/${this.state.billForm.budgetID}/allocatedBudget`,
  //     {budgetCategoryIDs: categoryIDs})
  //     .then((allocatedBudgets) => {
  //       categoryIDs.map((categoryID) => {
  //         let consumedAmount = 0, sanctionedAmount = 0, billCount = 0;
  //         // let objectToPush = {};
  //         categoriesOnBillform.map((category) => {
  //           if (category.budgetCategoryID === categoryID) {
  //             consumedAmount += category.consumedAmount;
  //             billCount += category.totalBills;
  //           }
  //         });
  //         let balance = 0;
  //         allocatedBudgets.map((budget) => {
  //           if (budget.budgetCategoryID === categoryID) {
  //             //Get latest sanctioned amount from allocated budget response
  //             sanctionedAmount += budget.sanctionedAmount;
  //             balance = budget.sanctionedAmount - budget.consumedAmount;
  //           }
  //         });
  //
  //         const name = this.getBudgetCategoryName(categoryID);
  //         this.state.budgetSummary.budgetCategoryNamesArray.push(name);
  //         this.state.budgetSummary.data[0].counts.push(billCount);
  //         this.state.budgetSummary.data[1].sanctionedAmounts.push(sanctionedAmount);
  //         this.state.budgetSummary.data[2].consumedAmounts.push(consumedAmount);
  //         this.state.budgetSummary.data[3].balance.push(balance);
  //       });
  //       this.setState({ budgetSummary: this.state.budgetSummary});
  //     })
  //     .catch((HTTPException) => {
  //       new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
  //       console.error(HTTPException.message);
  //     });
  // }

  // prepareBudgetSummary() {
  //   let categoriesOnBillform = this.state.billForm.allocatedBudgetCategories;
  //   let categoryIDSet = new Set();
  //   let totalBillsToBePaid = 0, totalAmountToBePaid = 0;
  //   //Create array of unique budget category IDs
  //   categoriesOnBillform.map((bill) => {
  //     categoryIDSet.add(bill.budgetCategoryID);
  //   });
  //   const categories = Array.from(categoryIDSet);
  //   return http.get(`${CONSTANTS.API_URL}/api/budget/${this.state.billForm.budgetID}/allocatedBudget`,
  //     {budgetCategoryIDs: categories})
  //     .then(() => {
  //       // allocatedBudgets response
  //       let displayArray = [];
  //       //Prepare object to be displayed in budget summary table
  //       categories.map((categoryID) => {
  //         let consumedAmount = 0, sanctionedAmount = 0, billCount = 0, balance = 0, actualConsumedAmount = 0;
  //         let objectToPush = {};
  //         categoriesOnBillform.map((bill) => {
  //           if (bill.budgetCategoryID === categoryID) {
  //             consumedAmount += bill.consumedAmount;
  //             actualConsumedAmount += bill.lastConsumedAmount;
  //             billCount += bill.totalBills;
  //             sanctionedAmount = bill.sanctionedAmount;
  //             balance = bill.balance;
  //           }
  //         });
  //         // allocatedBudgets.map((budget) => {
  //         //   if (budget.budgetCategoryID === categoryID) {
  //         //     //Get sanctioned amount from allocated budget response
  //         //     sanctionedAmount += budget.sanctionedAmount;
  //         //     //balance = difference between database values
  //         //     balance = budget.sanctionedAmount - budget.consumedAmount;
  //         //     actualConsumedAmount = budget.consumedAmount;
  //         //   }
  //         // });
  //         const name = this.getBudgetCategoryName(categoryID);
  //         const code = this.getBudgetCode(categoryID);
  //         objectToPush.budgetCategoryName = name;
  //         objectToPush.budgetCode = code;
  //         //consumedAmount = Current consumed amount
  //         objectToPush.consumedAmount = consumedAmount;
  //         objectToPush.billCount = billCount;
  //         objectToPush.sanctionedAmount = sanctionedAmount;
  //         objectToPush.actualConsumedAmount = actualConsumedAmount;
  //
  //         totalBillsToBePaid += objectToPush.billCount;
  //         totalAmountToBePaid += objectToPush.consumedAmount;
  //
  //         if (categoriesOnBillform.length) {
  //           categoriesOnBillform.map((row) => {
  //             if (row.budgetCategoryID.toString() === categoryID.toString()) {
  //               const diff = row.consumedAmount - consumedAmount;
  //               objectToPush.balance = balance + diff;
  //             }
  //             // else {
  //             //   objectToPush.balance = balance - consumedAmount;
  //             // }
  //           });
  //         } else {
  //           objectToPush.balance = balance - consumedAmount;
  //         }
  //
  //         displayArray.push(objectToPush);
  //         this.setState({
  //           budgetSummaryArray: displayArray,
  //           totalBillsToBePaid,
  //           totalAmountToBePaid
  //         });
  //       });
  //     })
  //     .catch((HTTPException) => {
  //       new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
  //       console.error(HTTPException.message);
  //     });
  // }

  prepareBudgetSummary() {
    return http.get(`${CONSTANTS.API_URL}/api/budgetMaps/${this.state.billFormID}`)
      .then((response) => {
        let displayArray = [];
        let totalBillsToBePaid = 0, totalAmountToBePaid = 0;
        response.map((mapObject) => {
          displayArray.push({
            actualConsumedAmount: mapObject.lastConsumedAmount,
            balance: mapObject.balance,
            billCount: mapObject.totalBills,
            budgetCategoryName: this.getBudgetCategoryName(mapObject.budgetCategoryID),
            budgetCode: mapObject.budgetCategoryCode,
            consumedAmount: mapObject.currentConsumedAmount,
            sanctionedAmount: mapObject.sanctionedAmount
          });
          totalBillsToBePaid += mapObject.totalBills;
          totalAmountToBePaid += mapObject.currentConsumedAmount;
        });
        this.setState({ budgetSummaryArray: displayArray,
          totalBillsToBePaid, totalAmountToBePaid });
        /*
        { actualConsumedAmount:0
          balance:7500
          billCount:2
          budgetCategoryName:"ABC"
          budgetCode:"RE 20 C103"
          consumedAmount:2500
          sanctionedAmount:10000 }
        */

      });
  }

  updateTharav(e){
    e.preventDefault();
    http.put(`${CONSTANTS.API_URL}/api/billform/tharavKramank/${this.state.billFormID}`,
      {tharavKramank: this.state.tharavKramank, tharavKramankDate: this.state.tharavKramankDate})
      .then(() => {
        this.toggleTharavKramankEditModal();
        if (this.state.isBillFormPreviewModalOpen){
          this.getHTMLBills();
          this.getHTMLBillform();
          this.getBillFormDetail();
        }
        new Toast('ठराव क्र. updated successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
      }).catch((HTTPException) => {
        console.error(HTTPException);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        this.setState({isHTMLBillFormResponseReceived: false});
      });
  }
  getBudgetCategoryName(id) {
    let cat = this.state.billFormDetails.budgetCategories.filter( (elem) => {
      if (elem.budgetCategoryID.toString() === id.toString()) return elem;
    })[0];
    return cat ? cat.budgetCategoryDisplayName : '-';
  }

  getBudgetCode(id) {
    let cat = this.state.billFormDetails.budgetCategories.filter( (elem) => {
      if (elem.budgetCategoryID.toString() === id.toString()) return elem;
    })[0];
    return cat ? cat.budgetCategoryCode : '-';
  }

  openEditPayableAmount(bill) {
    this.toggleBillEditModal();
    this.setState({
      billId : bill._id,
      payableAmount: bill.payableAmount,
      billType: bill.billType,
      selectedPaymentAmount: bill.selectedPaymentAmount,
      billStatusSelected: false,
      editPayableAmountButtonLocked: false
    });

    let amount = {};
    if (bill.securityDepositDemanded || bill.securityDepositDemanded === 0) {
      amount.securityDepositDemanded = bill.securityDepositDemanded;
    }
    if (bill.promptPaymentAmount || bill.promptPaymentAmount === 0) {
      amount.promptPaymentAmount = bill.promptPaymentAmount;
    }
    if (bill.totalRoundedBill || bill.totalRoundedBill === 0) {
      amount.billDueAmount = bill.totalRoundedBill;
    }
    if (bill.latePaymentAmount || bill.latePaymentAmount === 0) {
      amount.latePaymentAmount = bill.latePaymentAmount;
    }
    if (bill.totalCurrentBill || bill.totalCurrentBill === 0) {
      amount.totalCurrentBill = bill.totalCurrentBill;
    }
    this.setState({amount});

    if (bill.selectedPaymentAmount === "other") {
      this.setState({isOtherSelected: true});
    } else {
      this.setState({isOtherSelected: false});
    }
  }

  toggleBillEditModal() {
    this.setState({
      isOpenEditBillModal : !this.state.isOpenEditBillModal,
      billId: '',
      payableAmount: 0,
      billStatusSelected: false,
      selectedPaymentAmount: '',
      isOtherSelected: false
    });
  }

  toggleTharavKramankEditModal() {
    this.setState({
      isOpenEditTharavKramankModal : !this.state.isOpenEditTharavKramankModal,
      tharavKramank: this.state.tharavKramank,
      tharavKramankDate: this.state.tharavKramankDate
    });
  }

  closeTharavKramankEditModal(){
    let tharavDate =new Date(this.state.billForm.tharavKramankDate).toISOString().slice(0,10);
    this.setState({
      isOpenEditTharavKramankModal : !this.state.isOpenEditTharavKramankModal,
      tharavKramank: this.state.billForm.tharavKramank,
      tharavKramankDate: tharavDate
    });
  }

  getAmountToBePaid(e) {
    this.setState({ selectedPaymentAmount: e.target.value });

    if (this.state.selectedPaymentAmount !== "other") {
      let selectedAmount = this.state.amount[e.target.value];
      this.setState({isOtherSelected: false,payableAmount: selectedAmount });
    }
    else {
      this.setState({isOtherSelected: true,payableAmount: '' });
    }
  }

  editPayableAmount(e) {
    e.preventDefault();
    let body={};
    if (this.state.selectedPaymentAmount) {
      body.selectedPaymentAmount = this.state.selectedPaymentAmount;
    }
    if (this.state.selectedPaymentAmount === "other" && e.target.payableAmount) {
      body.payableAmount = Number(e.target.payableAmount.value);
    } else {
      body.payableAmount = this.state.payableAmount;
    }
    this.setState({editPayableAmountButtonLocked: true});
    return http.put(`${CONSTANTS.API_URL}/api/bill/${this.state.billId}/payableAmount`, body)
      .then(() => {
        this.setState({editPayableAmountButtonLocked: false});
        new Toast('Amount To Be Paid updated successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.toggleBillEditModal();
        this.getBillFormDetail();
      }).catch((HTTPException) => {
        this.setState({editPayableAmountButtonLocked: false});
        console.error(HTTPException);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  toggleMarkAsPaidModal(id) {
    this.setState({
      markAsPaid: !this.state.markAsPaid,
      receiptFile: null,
      receiptNumber: '',
      billID: id,
      isButtonLocked: false,
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
      return this.callApiForPayBillform(e);
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
            return this.callApiForPayBillform(e, fileDetails);
          });
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  callApiForPayBillform(e, file) {
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
    return http.put(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormDetails._id}/changeStatus`, body)
      .then(() => {
        new Toast(this.state.billFormDisplayName+" successfully marked as Paid", Toast.TYPE_DONE, Toast.TIME_LONG);
        this.toggleMarkAsPaidModal();
        this.getBillFormDetail();
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  getFileAndCheckFileSize(e) {
    this.setState({receiptFile: e.target.value});
    if (e.target.files[0].size > 5242880) {
      new Toast('File size should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
      return e.target.value = null;
    }
  }

  getReceiptFile() {
    let fileIDs = [];
    this.state.bills.forEach((bill) => {
      if (bill.fileID) {
        fileIDs.push(bill.fileID);
      }
    });
    if (fileIDs.length) {
      return http
        .get(`${CONSTANTS.API_URL}/api/files`, {fileIDs})
        .then((files) => {
          this.setState({files});
          this.setSignedURL();
        })
        .catch((HTTPException) => {
          console.error(HTTPException);
          new Toast('Error while reading file', Toast.TYPE_ERROR, Toast.TIME_LONG);
        });
    }
  }

  setSignedURL() {
    this.state.files.filter((file) => {
      this.state.bills.filter((bill) => {
        if (file._id === bill.fileID) {
          bill.signedURL = file.signedURL;
        }
      });
    });
  }

  setTaskDetailsObject(taskDetails) {
    let owner = taskDetails.authorID, requestedBy = taskDetails.updatedBy, requestedTo = taskDetails.assignedUserID;
    this.state.allUsers.map((item) => {
      if (item._id.toString() === owner) {
        taskDetails.ownerName = item.displayName;
      }
      if (item._id.toString() === requestedBy) {
        taskDetails.requestedByName = item.displayName;
      }
      if (item._id.toString() === requestedTo) {
        taskDetails.requestedToName = item.displayName;
      }
    });
    this.setState({taskDetails});
  }

  setBillFormDetailObject(billFormObject) {
    let createdBy= billFormObject.createdBy, wardIDArray = billFormObject.wardID, zoneIDArray = billFormObject.zoneID;
    let departmentIDArray = billFormObject.departmentID, foundWardArray = [], foundZoneArray = [], foundDeptArray = [];
    this.state.allUsers.map((item) => {
      if (item._id.toString() === createdBy) {
        billFormObject.createdByName = item.displayName;
      }
    });
    wardIDArray.forEach((id) => {
      foundWardArray.push(this.state.allWards.find((ward) => {
        return ward._id === id;
      }));
    });
    let wardNames = [];
    foundWardArray.map((ward) => {
      ward ? wardNames.push(ward.displayName) : '';
    });
    billFormObject.wardNames = wardNames.join(',');

    zoneIDArray.forEach((id) => {
      foundZoneArray.push(this.state.zoneList.find((zone) => {
        return zone._id === id;
      }));
    });
    let zoneNames = [];
    foundZoneArray.map((zone) => {
      zone ? zoneNames.push(zone.displayName) : '';
    });
    billFormObject.zoneNames = zoneNames.join(',');

    departmentIDArray.forEach((id) => {
      foundDeptArray.push(this.state.allDepartments.find((department) => {
        return department._id === id;
      }));
    });
    let deptNames = [];
    foundDeptArray.map((dept) => {
      dept ? deptNames.push(dept.displayName) : '';
    });
    this.setState({billFormDetails: billFormObject});
    console.log(this.state.billFormDetails,'billFormDetails');
    billFormObject.deptNames = deptNames.join(',');
  }

  // isCreatePaymentVoucherButtonDisplayed() {
  //   const billFormStatus = (this.state.billForm.status === 'approved' ? true : false);
  //   const isPaymentVoucherCreated = !this.state.billForm.paymentVoucherID;
  //   const isClientAdmin =  !this.state.isClientAdmin;
  //   const isCreationRequired = this.state.isPaymentVoucherCreationRequired;
  //   const isLoggedInUserAndResponsibleDepartmentSame = this.state.loggedUserDepartmentIDs.includes(this.state.taskDetails.assignedDepartmentID);
  //
  //   return billFormStatus && isPaymentVoucherCreated && isClientAdmin && isLoggedInUserAndResponsibleDepartmentSame && isCreationRequired;
  // }

  // isRequestChangesButtonDisplayed() {
  //   let requestChanges = false;
  //   if (this.state.billForm.status === 'approved' && !this.state.billForm.paymentVoucherID) {
  //     if (this.state.billFormVisibilityMode === 'otherdepartment'){
  //       requestChanges = this.state.loggedUserDepartmentIDs.toString().includes(this.state.nextDepartmentAfterBillformTaskApproval.toString());
  //     }
  //     else {
  //       requestChanges = this.state.loggedUserDepartmentIDs.toString().includes(this.state.billForm.responsibleDepartmentID.toString());
  //     }
  //   }
  //   return requestChanges;
  // }

  // isBillFormMarkAsPaidButtonVisible() {
  //   const responsibleDepartment = this.state.billForm.responsibleDepartmentID;
  //   const loggedUserDepartment = this.state.loggedUserDepartmentIDs;
  //   const condition = loggedUserDepartment.includes(responsibleDepartment);
  //   return condition;
  // }

  // markBillFormPaid() {
  //   let confirmation = confirm('The status of '+this.state.billFormDisplayName+' will be changed to PAID along with all the bills. Are you '+
  //   'sure you want to proceed?');
  //   if (!confirmation) return;
  //   return http.put(`${CONSTANTS.API_URL}/api/billform/${this.state.billForm._id}/changeStatus`, { status: 'paid' })
  //     .then(() => {
  //       new Toast(this.state.billFormDisplayName+" successfully marked as 'Paid'", Toast.TYPE_DONE, Toast.TIME_LONG);
  //       this.getBillFormDetail();
  //       this.getBillFormHistory();
  //     })
  //     .catch((HTTPException) => {
  //       console.error(HTTPException.message);
  //       new Toast('Error while reading file', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //     });
  // }

  // toggleReceiptModal(bill) {
  //   this.setState({isReceiptModalOpen: !this.state.isReceiptModalOpen, bill});
  // }
  // refreshBillStatus(bill) {
  //   startLoader();
  //   return http.get(`${CONSTANTS.API_URL}/api/company/${bill.companyID}/${bill._id}/getPaymentStatus`)
  //     .then(() => {
  //       new Toast("Bill Payment Updated Successfully.", Toast.TYPE_DONE, Toast.TIME_LONG);
  //       this.getBillFormDetail();
  //     })
  //     .catch((HTTPException) => {
  //       stopLoader();
  //       console.error(HTTPException.message);
  //       new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
  //     });
  // }

  // showBillFailureReason(bill) {
  //   this.setState({isShowBillFailureReason: !this.state.isShowBillFailureReason, billFailureReason: 'No Reason.'});
  //   if (bill.bomFetchBillFailureReason || bill.bomPayBillFailureReason) {
  //     this.setState({
  //       billFailureReason : bill.bomFetchBillFailureReason ? bill.bomFetchBillFailureReason : bill.bomPayBillFailureReason
  //     });
  //   }
  // }

  // closeBillFailureReason() {
  //   this.setState({isShowBillFailureReason: !this.state.isShowBillFailureReason, billFailureReason:''});
  // }

  // downloadAbstractData(){
  //   // T1419: Allow template creations and print actions on bill form only when it is approved
  //   // Developer: samruddhi
  //   // Date: 10/7/2018
  //   // The document cannot be printed because IF it is not approved
  //   if (this.state.billForm.status !== 'approved')
  //   {
  //     stopLoader();
  //     return new Toast('The document cannot be printed because '+ this.state.billFormDisplayName +' is not approved yet', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //   }
  //   this.setState({isDownloadAbstract:true});
  //   return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/abstractTemplate`)
  //     .then((response) => {
  //       this.setState({HTMLAbstract: response, abstractData: response.abstractData, isDownloadAbstract:false});
  //
  //       this.toDataURL('/assets/static/pmc_logo.png',
  //         (dataUrl) => {
  //           this.generatePdfData(response.abstractData, dataUrl);
  //         }
  //       );
  //       stopLoader();
  //     }).catch((HTTPException) => {
  //       stopLoader();
  //       new Toast('Error while fetching abstract.', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //       console.error(HTTPException);
  //       this.setState({isDownloadAbstract:false});
  //     });
  // }

  // downloadAbstractVersionAData(){
  //   if (this.state.billForm.status !== 'approved')
  //   {
  //     stopLoader();
  //     return new Toast('The document cannot be printed because '+ this.state.billFormDisplayName +' is not approved yet', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //   }
  //   this.setState({isDownloadAbstract:true});
  //   return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/abstractVersionATemplate`)
  //     .then((response) => {
  //       this.setState({HTMLAbstractVersionA: response, abstractVersionAData: response.abstractData, isDownloadAbstract:false});
  //
  //       this.toDataURL('/assets/static/pmc_logo.png',
  //         (dataUrl) => {
  //           this.generatePdfDataForAbstractVersionA(response.abstractData, dataUrl);
  //         }
  //       );
  //       stopLoader();
  //     }).catch((HTTPException) => {
  //       stopLoader();
  //       new Toast('Error while fetching abstract version A.', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //       console.error(HTTPException);
  //       this.setState({isDownloadAbstract:false});
  //     });
  // }

  // downloadBudgetSummaryData(){
  //   // T1419: Allow template creations and print actions on bill form only when it is approved
  //   // Developer: samruddhi
  //   // Date: 10/7/2018
  //   // The document cannot be printed because IF it is not approved
  //   if (this.state.billForm.status !== 'approved')
  //   {
  //     stopLoader();
  //     return new Toast('The document cannot be printed because '+ this.state.billFormDisplayName +' is not approved yet', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //   }
  //   this.setState({isDownloadBudgetSummary:true});
  //   return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/budgetSummaryTemplate`)
  //     .then((response) => {
  //       this.setState({HTMLAbstract: response, budgetSummaryData: response.budgetSummaryData, isDownloadBudgetSummary:false});
  //
  //       this.toDataURL('/assets/static/pmc_logo.png',
  //         (dataUrl) => {
  //           this.generatePdfDataForBudgetSummary (response.budgetSummaryData, dataUrl);
  //         }
  //       );
  //       stopLoader();
  //     }).catch((HTTPException) => {
  //       stopLoader();
  //       new Toast('Error while fetching budget summary.', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //       console.error(HTTPException);
  //       this.setState({isDownloadBudgetSummary:false});
  //     });
  // }
  // T1649:Abstract TWO
  // Developer: samruddhi
  // Date:23/8/2018
  // downloadAbstractTwoData() {
  //   if (this.state.billForm.status !== 'approved')
  //   {
  //     stopLoader();
  //     return new Toast('The document cannot be printed because '+ this.state.billFormDisplayName +' is not approved yet', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //   }
  //   this.setState({isDownloadAbstractTwo:true});
  //   return http.get(`${CONSTANTS.API_URL}/api/billform/${this.state.billFormID}/abstractTwoTemplate`)
  //     .then((response) => {
  //       this.setState({HTMLAbstract: response, abstractTwoData: response.htmlAbstractData, isDownloadAbstractTwo:false});
  //
  //       this.toDataURL('/assets/static/pmc_logo.png',
  //         (dataUrl) => {
  //           this.generatePdfDataForAbstractTwo (response.htmlAbstractData, dataUrl);
  //         }
  //       );
  //       stopLoader();
  //     }).catch((HTTPException) => {
  //       stopLoader();
  //       new Toast('Error while fetching abstract II.', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //       console.error(HTTPException);
  //       this.setState({isDownloadAbstractTwo:false});
  //     });
  // }

  // toDataURL(src, callback, outputFormat) {
  //   let img = new Image();
  //   img.crossOrigin = 'Anonymous';
  //   img.onload = function() {
  //     let canvas = document.createElement('CANVAS');
  //     let ctx = canvas.getContext('2d');
  //     let dataURL;
  //     canvas.height = this.naturalHeight;
  //     canvas.width = this.naturalWidth;
  //     ctx.drawImage(this, 0, 0);
  //     dataURL = canvas.toDataURL(outputFormat);
  //     callback(dataURL);
  //   };
  //   img.src = src;
  //   // if (img.complete || img.complete === undefined) {
  //   //   img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  //   //   img.src = src;
  //   // }
  // }

  // generatePdfDataForBudgetSummary(data, dataUrl) {
  //   let abstractBudgetDataArray = [];
  //   let abstractBudgetDataHeader = [{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'},
  //     // {text: 'Number of Bills', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Provision\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Expenses\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Bill Amount\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'}
  //     // {text: 'Balance Budget\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'}
  //   ];
  //   let abstractBudgetTotal = ['',
  //     {text: 'Total', bold:true},
  //     // {text: data.totalSanctionedAmount, bold:true},
  //     {text: '-', bold:true},
  //     // {text: data.totalLastConsumedAmount, bold:true},
  //     {text: '-', bold:true},
  //     // {text: '', bold:true},
  //     {text: data.totalConsumedAmount, bold:true}];
  //   // {text: data.totalBalance, bold:true}];
  //   // {text: '', bold:true}];
  //   abstractBudgetDataArray.push(abstractBudgetDataHeader);
  //
  //   data.budgetSummary.map((budget, index) => {
  //     let budgetArray = [index + 1];
  //     let budgetCode = budget.budgetCode ? budget.budgetCode : '-';
  //     let budgetName = budget.name ? budget.name : '-';
  //     let budgetDesc = budget.description ? budget.description : '-';
  //     let budgetCodeName = budgetCode + '\n' + budgetName + '\n' + budgetDesc;
  //     budgetArray.push(budgetCodeName);
  //     // budget.name ? budgetArray.push(budget.name) : budgetArray.push('-');
  //     // budget.totalBills ? budgetArray.push(budget.totalBills) : budgetArray.push('-');
  //     budget.sanctionedAmount ? budgetArray.push({text: budget.sanctionedAmount, italics:true}) : budgetArray.push('-');
  //     budget.lastConsumedAmount ? budgetArray.push({text: budget.lastConsumedAmount, italics:true}) : budgetArray.push('-');
  //     // budgetArray.push('');
  //     budget.consumedAmount ? budgetArray.push({text: budget.consumedAmount, italics:true}) : budgetArray.push('-');
  //     // budget.balance ? budgetArray.push(budget.balance) : budgetArray.push('-');
  //     // budgetArray.push('');
  //     abstractBudgetDataArray.push(budgetArray);
  //     if (data.budgetSummary.length === index + 1) {
  //       abstractBudgetDataArray.push(abstractBudgetTotal);
  //     }
  //   });
  //
  //   this.setState({abstractBudgetDataArray});
  //
  //
  //   if (abstractBudgetDataArray.length) this.makePDFForBudgetSummary(data, abstractBudgetDataArray, dataUrl);
  // }
  // T1649:Abstract TWO
  // Developer: samruddhi
  // Date:23/8/2018
  // generatePdfDataForAbstractTwo(data, dataUrl) {
  //   let abstractTwoDataArray = [];
  //   let abstractTwoDataHeader = [{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Bill Date', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Bill Month', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Billing\nUnit', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Consumer Number', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Duration', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Units', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'T No.', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Stha No.', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Cheque No.\n and Date', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount', style: 'abstractTableHeader', alignment: 'center'}
  //   ];
  //
  //   abstractTwoDataArray.push(abstractTwoDataHeader);
  //
  //   data.consumerSummary.map((consumer, index) => {
  //     // let consumerArray = [];
  //     if (((index !== 0) && (data.consumerSummary.length > 8 ) && (index % 9  === 0)) || ((data.consumerSummary.length === 8 ) && (index === 9))) {
  //
  //
  //       abstractTwoDataArray.push([{text: 'Sr.\nNo', style: 'abstractTableHeader',pageBreak:'before', alignment: 'center'},
  //         {text: 'Bill Date', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Bill Month', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Billing\nUnit', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Consumer Number', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Duration', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Units', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Amount', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'T No.', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Stha No.', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Cheque No.\n and Date', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'},
  //         {text: 'Amount', style: 'abstractTableHeader', pageBreak:'before', alignment: 'center'}]);
  //     }
  //     let consumerArray = [];
  //     consumerArray.push(index + 1);
  //     consumer.billDate ? consumerArray.push({text: consumer.billDate}) : consumerArray.push('-');
  //     consumer.billMonth ? consumerArray.push({text: consumer.billMonth}) : consumerArray.push('-');
  //     consumer.billingUnitNumber ? consumerArray.push({text: consumer.billingUnitNumber}) : consumerArray.push('-');
  //     consumer.consumerNumber ? consumerArray.push({text: consumer.consumerNumber}) : consumerArray.push('-');
  //     let duration;
  //     if (consumer.toDate && consumer.fromDate) {
  //       duration = consumer.fromDate + '\nTo\n' + consumer.toDate;
  //     }
  //     else if (consumer.previousReadingDate && consumer.currentReadingDate) {
  //       duration = consumer.previousReadingDate + '\nTo\n' + consumer.currentReadingDate;
  //     }
  //     else {
  //       duration = '-';
  //     }
  //     consumerArray.push({text:duration,alignment: 'center'});
  //
  //     (consumer.consumedUnits || consumer.consumedUnits === 0) ? consumerArray.push({text: consumer.consumedUnits}) : consumerArray.push('-');
  //     consumer.billedAmount ? consumerArray.push({text: consumer.billedAmount, italics:true}) : consumerArray.push('-');
  //     consumerArray.push({text: ''});
  //     consumerArray.push({text: ''});
  //     consumerArray.push({text: ''});
  //     consumerArray.push({text: ''});
  //     abstractTwoDataArray.push(consumerArray);
  //   });
  //
  //   this.setState({abstractTwoDataArray});
  //
  //
  //   if (abstractTwoDataArray.length) this.makePDFForAbstractTwo(data, abstractTwoDataArray, dataUrl);
  // }

  // T1409 : Marathi font is not properly displayed in PDF
  // developer: Manohar
  // commented totalBalance and remove width We are not showing balance in budget summary
  // Date: 18/07/18

  // generatePdfData(data, dataUrl) {
  //   let totalPaidAmountAsPerPage = 0;
  //   let abstractDataArray = [[{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Consumer\nInformation', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Parameter', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Last\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Current\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount\nBeing Paid', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Eligible Discount/\n(Late Fee **)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'}]];
  //   let totalPaidAmount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'Total Paid', bold:true}, {text: data.totalPaidAmount, bold:true}, '', ''];
  //   let totalPromptDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'Prompt Discount', bold:true}, '-', {text: data.totalPromptAmount, bold:true}, ''];
  //   let totalLateDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'DPC', bold:true}, '-', {text: data.totalLateAmount, bold:true}, ''];
  //
  //   data.consumerSummary.map((item, index) => {
  //     // let billFor = [{rowSpan: 5, text: index + 1},
  //     //   {rowSpan: 5, text: [
  //     //     {text: item.consumerNumber, bold: true, fontSize: 9},
  //     //     {text: '\nBU:' + item.billingUnitNumber},
  //     //     {text: '\nBill for:\n' + item.billMonth},
  //     //     {rowSpan: 5, text: '\nMeter Status:\n'},
  //     //     {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //     //   ]},
  //     //   'Bill For', item.lastMonthBillMonth, item.billMonth,
  //     //   {rowSpan: 5, text: item.billedAmount},
  //     //   {rowSpan: 5, text: item.promptOrLateAmount},
  //     //   {rowSpan: 5, text: item.budgetCode}
  //     // ];
  //     // let fromDate = ['', '', {text:'From Date', fontSize: 9}, item.lastMonthPreviousMeterReadingDate, item.previousMeterReadingDate, '', '', ''];
  //     // let toDate = ['', '', {text:'To Date', fontSize: 9}, item.lastMonthCurrentMeterReadingDate, item.currentMeterReadingDate, '', '', ''];
  //     // let meterReading = ['', '', {text:'Meter Reading', fontSize: 9}, item.previousReading, item.currentReading, '', '', ''];
  //     // let unitConsumed = ['', '', {text:'Units Consumed', fontSize: 9}, item.lastMonthConsumedUnits, item.consumedUnits, '', '', ''];
  //     let unitConsumed = [{rowSpan: 5, text: index + 1},
  //       {rowSpan: 5, text: [
  //         {text: item.consumerNumber, bold: true, fontSize: 9},
  //         {text: '\nBU:' + item.billingUnitNumber},
  //         {text: '\nBill for:\n' + item.billMonth},
  //         {rowSpan: 5, text: '\nMeter Status:\n'},
  //         {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //       ]},
  //       {text:'Units Consumed', fontSize: 9},item.lastMonthConsumedUnits, item.consumedUnits,
  //       {rowSpan: 5, text: item.paidAmount + '\n' + (item.billDueDate ? ('\nDue Date:\n' + item.billDueDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.promptOrLateAmount + '\n' + (item.promptPaymentDate ? ('\nPrompt Date:\n' + item.promptPaymentDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.budgetCode}
  //     ];
  //     // as per comment on T1418 NA added
  //     // T1418: Download Button of Only Abstract is not working. User is not able to download the abstract.
  //     // developer: samruddhi
  //     // date: 10/7/18
  //     let changeLastMonth = ['', '', {text:'Month Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastMonthUnits, '', '', ''];
  //     let changeLastYear = ['', '', {text:'Year Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastYearUnits, '', '', ''];
  //     let arrears = ['', '', {text:'Arrears', fontSize: 9}, {text: item.lastMonthArrears, italics:true}, {text: item.arrears, italics:true}, '', '', ''];
  //     let totalBillAmount = ['', '', {text:'Total Bill Amount', fontSize: 9}, {text: item.lastMonthBilledAmount, italics:true},
  //       {text:item.billedAmount, bold:true, fontSize: 9}, '', '', ''];
  //
  //     if (((index !== 0) && (data.consumerSummary.length > 7 ) && (index % 8  === 0)) || ((data.consumerSummary.length === 8 ) && (index === 7))) {
  //       abstractDataArray.push(['', '', '', '', {text:'Carried Forward', bold:true},
  //         {text: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPaidAmountAsPerPage.toFixed(2)), bold:true}, '', '']);
  //       totalPaidAmountAsPerPage = 0;
  //       abstractDataArray.push([{text: 'Sr.\nNo', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Consumer\nInformation', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Parameter', pageBreak:  'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Last\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Current\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Amount\nBeing Paid', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Eligible Discount/\n(Late Fee **)', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Budget Code', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'}
  //       ]);
  //
  //     }
  //
  //     totalPaidAmountAsPerPage = totalPaidAmountAsPerPage + item.paidAmountForPDF;
  //     // abstractDataArray.push(billFor);
  //     // abstractDataArray.push(fromDate);
  //     // abstractDataArray.push(toDate);
  //     // abstractDataArray.push(meterReading);
  //     abstractDataArray.push(unitConsumed);
  //     abstractDataArray.push(changeLastMonth);
  //     abstractDataArray.push(changeLastYear);
  //     abstractDataArray.push(arrears);
  //     abstractDataArray.push(totalBillAmount);
  //     if (data.consumerSummary.length === index + 1) {
  //       abstractDataArray.push(totalPaidAmount);
  //       abstractDataArray.push(totalPromptDiscount);
  //       abstractDataArray.push(totalLateDiscount);
  //     }
  //   });
  //   this.setState({abstractDataArray});
  //
  //   let abstractBudgetDataArray = [];
  //   let abstractBudgetDataHeader = [{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'},
  //     // {text: 'Number of Bills', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Provision\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Expenses\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount\nBeing Paid (Rs.)', style: 'abstractTableHeader', alignment: 'center'}
  //     // {text: 'Balance Budget\n(Rs.)', style: 'abstractTableHeader', alignment: 'center'}
  //   ];
  //   let abstractBudgetTotal = ['',
  //     {text: 'Total', bold:true},
  //     // {text: data.totalSanctionedAmount, bold:true},
  //     {text: '', bold:true},
  //     // {text: data.totalLastConsumedAmount, bold:true},
  //     {text: '', bold:true},
  //     // {text: '', bold:true},
  //     {text: data.totalConsumedAmount, bold:true}
  //     // {text: data.totalBalance, bold:true}
  //   ];
  //     // {text: '', bold:true}];
  //   abstractBudgetDataArray.push(abstractBudgetDataHeader);
  //
  //   data.budgetSummary.map((budget, index) => {
  //     let budgetArray = [index + 1];
  //     budget.budgetCode ? budgetArray.push(budget.budgetCode) : budgetArray.push('-');
  //     // budget.totalBills ? budgetArray.push(budget.totalBills) : budgetArray.push('-');
  //     budget.sanctionedAmount ? budgetArray.push({text: budget.sanctionedAmount, italics:true}) : budgetArray.push('-');
  //     budget.lastConsumedAmount ? budgetArray.push({text: budget.lastConsumedAmount, italics:true}) : budgetArray.push('-');
  //     // budgetArray.push('');
  //     budget.consumedAmount ? budgetArray.push({text: budget.consumedAmount, italics:true}) : budgetArray.push('-');
  //     // budget.balance ? budgetArray.push(budget.balance) : budgetArray.push('-');
  //     // budgetArray.push('');
  //     abstractBudgetDataArray.push(budgetArray);
  //     if (data.budgetSummary.length === index + 1) {
  //       abstractBudgetDataArray.push(abstractBudgetTotal);
  //     }
  //   });
  //
  //   this.setState({abstractBudgetDataArray});
  //
  //
  //   if (abstractDataArray.length) this.makePDF(data, abstractDataArray, abstractBudgetDataArray, dataUrl);
  // }


  // makePDF(dataPDF ,abstractDataArray, abstractBudgetDataArray, dataUrl) {
  //   let userName = this.state.userInfo.name;
  //   const currentDate = formatDateTime(new Date(), true);
  //   const billFormCreationDate = formatDateTime(dataPDF.billFormCreatedDateForPDF);
  //   pdfMake.fonts = PDFSTYLE.fonts;
  //   let docDefinition = {
  //     pageSize: PDFSTYLE.pageSetup.pageSize,
  //     pageOrientation: PDFSTYLE.pageSetup.pageOrientationPortrait,
  //     pageMargins: PDFSTYLE.pageSetup.abstractPageMargins,
  //     // header() {
  //     //   return { style: 'pageHeader',
  //     //     columns: [
  //     //       { text: currentDate, alignment: 'right'}
  //     //     ]};
  //     // },
  //
  //     footer(currentPage, pageCount) { return { style: 'pageFooter',
  //       columns: [{
  //         text:[
  //           { text: 'Created by Powerdek'},
  //           { text: ' TM', fontSize:5}
  //         ]
  //       },
  //
  //       { text: currentDate + ' By ' + userName + ' | ' + currentPage.toString() + ' of ' + pageCount, alignment: 'right'}
  //       ]};},
  //
  //     content: [
  //       {
  //         columns: [
  //           {
  //             image: dataUrl,
  //             width: 90,
  //             height: 60
  //           },
  //           {
  //             width: 120,
  //             margin: [5, 5, 5, 5],
  //             text: dataPDF.companyName + '\n(' + dataPDF.departmentName + ' DEPT.)',
  //             fontSize: 11,
  //             alignment: 'center'
  //           },
  //           {
  //             width: 90,
  //             fontSize: 9,
  //             alignment: 'center',
  //             margin: [5, 5, 5, 5],
  //             text: [
  //               {text: 'ELECTRICITY \nBILLS PAYMENT\n'},
  //               {text: 'ABSTRACT', bold: true}
  //             ]
  //           },
  //           {
  //             width: '*',
  //             style: 'tableExample',
  //             fontSize: 9,
  //             table: {
  //               body: [
  //                 ['Bill Form No.', dataPDF.customerBillFormNumber],
  //                 ['Bill Form Creation Date', billFormCreationDate],
  //                 ['Being Paid to', dataPDF.billFormBeingPaidTo]
  //               ]
  //             }
  //           }
  //         ]
  //       },
  //       { margin: [0, 3, 0, 0],
  //         fontSize: 11,
  //         bold:true,
  //         text: 'Part (A) : Consumer-wise Units Consumption and Amount Paid'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 9,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           widths: ['auto', 65,70,68,68,70,60,58],
  //           headerRows: 0,
  //           // keepWithHeaderRows: 1,
  //           body: abstractDataArray
  //         }
  //       },
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 8,
  //         pageBreak: 'after',
  //         text: '** Effective Eligible Discount / Late Fee is shown considering Bill Form creation date. It may vary depending upon the actual date of payment effect into ' + dataPDF.billFormBeingPaidTo + ' account.'
  //       },
  //       {
  //         columns: [
  //           {
  //             image: dataUrl,
  //             width: 90,
  //             height: 60
  //           },
  //           {
  //             width: 120,
  //             margin: [5, 5, 5, 5],
  //             text: dataPDF.companyName + '\n(' + dataPDF.departmentName + ' DEPT.)',
  //             fontSize: 11,
  //             alignment: 'center'
  //           },
  //           {
  //             width: 90,
  //             fontSize: 9,
  //             alignment: 'center',
  //             margin: [5, 5, 5, 5],
  //             text: [
  //               {text: 'ELECTRICITY \nBILLS PAYMENT\n'},
  //               {text: 'ABSTRACT', bold: true}
  //             ]
  //           },
  //           {
  //             width: '*',
  //             style: 'tableExample',
  //             fontSize: 9,
  //             margin: [5, 5, 5, 0],
  //             table: {
  //               body: [
  //                 ['Bill Form No.', dataPDF.customerBillFormNumber],
  //                 ['Bill Form Creation Date', billFormCreationDate],
  //                 ['Being Paid to', dataPDF.billFormBeingPaidTo]
  //               ]
  //             }
  //           }
  //         ]
  //       },
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 11,
  //         bold:true,
  //         text: 'Part (B) : Budget Code-wise Summary'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 10,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           widths: ['auto', 100, 115, 115, 115],
  //           headerRows: 1,
  //           // keepWithHeaderRows: 1,
  //           body: abstractBudgetDataArray
  //         }
  //       }
  //     ],
  //     styles: PDFSTYLE.styles
  //   };
  //   //Refer: http://pdfmake.org/#/gettingstarted of pdfMake documentation
  //   // open the PDF in a new window
  //   pdfMake.createPdf(docDefinition).open();
  //   // print the PDF
  //   // pdfMake.createPdf(docDefinition).print();
  //   // download the PDF
  //   // pdfMake.createPdf(docDefinition).download('powerdekPerformanceAssurence.pdf');
  // }
  //
  // makePDFForBudgetSummary(dataPDF, abstractBudgetDataArray, dataUrl) {
  //
  //
  //   let userName = this.state.userInfo.name;
  //   const currentDate = formatDateTime(new Date(), true);
  //   const billFormCreationDate = formatDateTime(dataPDF.billFormCreatedDateForPDF);
  //   pdfMake.fonts = PDFSTYLE.fonts;
  //   let docDefinition = {
  //     pageSize: PDFSTYLE.pageSetup.pageSize,
  //     pageOrientation: PDFSTYLE.pageSetup.pageOrientationPortrait,
  //     pageMargins: PDFSTYLE.pageSetup.abstractPageMargins,
  //     // header() {
  //     //   return { style: 'pageHeader',
  //     //     columns: [
  //     //       { text: currentDate, alignment: 'right'}
  //     //     ]};
  //     // },
  //
  //     footer(currentPage, pageCount) { return { style: 'pageFooter',
  //       columns: [{
  //         text:[
  //           { text: 'Created by Powerdek'},
  //           { text: ' TM', fontSize:5}
  //         ]
  //       },
  //
  //       { text: currentDate + ' By ' + userName + ' | ' + currentPage.toString() + ' of ' + pageCount, alignment: 'right'}
  //       ]};},
  //
  //     content: [
  //       {
  //         columns: [
  //           {
  //             image: dataUrl,
  //             width: 90,
  //             height: 60
  //           },
  //           {
  //             width: 120,
  //             margin: [5, 5, 5, 5],
  //             text: dataPDF.companyName + '\n(' + dataPDF.departmentName + ' DEPT.)',
  //             // bold: true,
  //             fontSize: 11,
  //             alignment: 'center'
  //           },
  //           {
  //             width: 90,
  //             fontSize: 9,
  //             alignment: 'center',
  //             margin: [5, 5, 5, 5],
  //             defaultStyle: {
  //               font: 'Marathi'
  //             },
  //             text: [
  //               {text: 'ELECTRICITY \nBILLS PAYMENT\n'},
  //               {text: 'ABSTRACT', bold: true}
  //             ]
  //           },
  //           {
  //             width: '*',
  //             style: 'tableExample',
  //             fontSize: 9,
  //             margin: [5, 5, 5, 0],
  //             table: {
  //               body: [
  //                 ['Bill Form No.', dataPDF.customerBillFormNumber],
  //                 ['Bill Form Creation Date', billFormCreationDate],
  //                 ['Being Paid to', dataPDF.billFormBeingPaidTo]
  //               ]
  //             }
  //           }
  //         ]
  //       },
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 11,
  //         text: 'Part (B) : Budget Code-wise Summary'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 10,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           widths: ['auto', 190, 90, 90, 85],
  //           headerRows: 1,
  //           // keepWithHeaderRows: 1,
  //           body: abstractBudgetDataArray
  //         }
  //       },
  //       { margin: [0, 100, 0, 5],
  //         pageBreak: 'before',
  //         text: [
  //           {text: 'मा.अंतर्गत अर्थान्विक्षक'},
  //           {text: '\nपुणे म.न.पा.'}
  //         ]
  //       },
  //       { margin: [0, 100, 0, 5],
  //         text: [
  //           {text: 'यांस ...', alignment:'center'}
  //         ]
  //       },
  //       {
  //         text: 'वरील (एम .एस .ई .बी ) यादीतील प्रत्येक बिलाच्या ग्राहक क्रमांक, युनिटस व दर यांची तपासणी केली असून ती बरोबर',
  //         margin: [20,0,20,0]
  //       },
  //       {
  //         margin: [0,0,20,0],
  //         text: [
  //           ' व योग्य आहे, सदर देयकातील रकमांनुसार देयके आदा करणेस खात्याची  शिफारस  असून त्याबाबत भविष्यात कोणतीही वसुली, चूक, दुबार बिल अथवा जादा आदा रक्कम निघाल्यास त्याबाबतची सर्वस्वी जबाबदारी खात्याची राहील .रक्कम रु,'
  //         ]
  //       },
  //       { margin: [20, 100, 0, 5],
  //         text: [
  //           {text: 'कळावे,'}
  //         ]
  //       },
  //       { margin: [300, 100, 20, 0],
  //         text: [
  //           {text: 'कार्यकारी अभियंता (विद्युत)'},
  //           {text: '\nपुणे महानगरपालिका '}
  //         ]
  //       }
  //     ],
  //     styles: PDFSTYLE.styles
  //   };
  //   // open the PDF in a new window
  //   pdfMake.createPdf(docDefinition).open();
  //   // print the PDF
  //   // pdfMake.createPdf(docDefinition).print();
  //   // download the PDF
  //   // pdfMake.createPdf(docDefinition).download('powerdekPerformanceAssurence.pdf');
  // }
  //
  // makePDFForAbstractTwo(dataPDF, abstractTwoDataArray, dataUrl) {
  //   let userName = this.state.userInfo.name;
  //   const currentDate = formatDateTime(new Date(), true);
  //   const billFormCreationDate = formatDateTime(dataPDF.billFormCreatedDateForPDF);
  //   pdfMake.fonts = PDFSTYLE.fonts;
  //   let docDefinition = {
  //     pageSize: PDFSTYLE.pageSetup.pageSize,
  //     pageOrientation: PDFSTYLE.pageSetup.pageOrientationLandscape,
  //     pageMargins: PDFSTYLE.pageSetup.abstractTwoPageMargins,
  //     // header() {
  //     //   return { style: 'pageHeader',
  //     //     columns: [
  //     //       { text: currentDate, alignment: 'right'}
  //     //     ]};
  //     // },
  //
  //     footer(currentPage, pageCount) { return { style: 'pageFooter',
  //       columns: [{
  //         text:[
  //           { text: 'Created by Powerdek'},
  //           { text: ' TM', fontSize:5}
  //         ]
  //       },
  //
  //       { text: currentDate + ' By ' + userName + ' | ' + currentPage.toString() + ' of ' + pageCount, alignment: 'right'}
  //       ]};},
  //
  //     content: [
  //       {
  //         columns: [
  //           {
  //             image: dataUrl,
  //             width: 120,
  //             height: 60
  //           },
  //           {
  //             width: 150,
  //             margin: [5, 7, 5, 3],
  //             text: dataPDF.companyName + '\n(' + dataPDF.departmentName + ' DEPT.)',
  //             // bold: true,
  //             fontSize: 11,
  //             alignment: 'center'
  //           },
  //           {
  //             width: 170,
  //             fontSize: 10,
  //             alignment: 'center',
  //             margin: [50, 7, 5, 3],
  //             text: [
  //               {text: 'ELECTRICITY \nBILLS PAYMENT\n'},
  //               {text: 'ABSTRACT II', bold: true}
  //             ]
  //           },
  //           {
  //             width: '*',
  //             style: 'tableExample',
  //             fontSize: 9,
  //             margin: [50, 5, 5, 0],
  //             table: {
  //               body: [
  //                 ['Bill Form No.', dataPDF.customerBillFormNumber],
  //                 ['Bill Form Creation Date', billFormCreationDate],
  //                 ['Being Paid to', dataPDF.billFormBeingPaidTo]
  //               ]
  //             }
  //           }
  //         ]
  //       },
  //       { margin: [0, 3, 0, 3],
  //         fontSize: 11,
  //         text: 'Consumer-wise Units Consumption and Amount'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 10,
  //         margin: [0, 3, 0, 5],
  //         table: {
  //           widths: ['auto', 'auto', 'auto', 'auto', 'auto', 60, 'auto', 'auto',65,65,65,65],
  //           // headerRows: 1,
  //           // keepWithHeaderRows: 1,
  //           body: abstractTwoDataArray
  //         }
  //       }
  //     ],
  //     styles: PDFSTYLE.styles
  //   };
  //   // open the PDF in a new window
  //   pdfMake.createPdf(docDefinition).open();
  //   // print the PDF
  //   // pdfMake.createPdf(docDefinition).print();
  //   // download the PDF
  //   // pdfMake.createPdf(docDefinition).download('powerdekPerformanceAssurence.pdf');
  // }
  //
  // generatePdfDataForAbstractVersionA(data, dataUrl) {
  //   let totalPaidAmountAsPerPage = 0, abstractVersionAData = {normalStatusWithoutArrears:[],normalStatusWithArrears:[],notNormalStatusWithoutArrears:[],notNormalStatusWithArrears:[]},
  //     normalStatusWithoutArrearsArray = [], normalStatusWithArrearsArray = [], notNormalStatusWithoutArrearsArray = [], notNormalStatusWithArrearsArray = [];
  //   // let headerArray = [{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Consumer\nInformation', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Parameter', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Last\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Current\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Amount\nBeing Paid', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Eligible Discount/\n(Late Fee **)', style: 'abstractTableHeader', alignment: 'center'},
  //   //   {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'}];
  //
  //   normalStatusWithoutArrearsArray.push([{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Consumer\nInformation', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Parameter', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Last\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Current\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount\nBeing Paid', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Eligible Discount/\n(Late Fee **)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'}]);
  //
  //   normalStatusWithArrearsArray.push([{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Consumer\nInformation', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Parameter', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Last\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Current\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount\nBeing Paid', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Eligible Discount/\n(Late Fee **)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'}]);
  //
  //   notNormalStatusWithoutArrearsArray.push([{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Consumer\nInformation', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Parameter', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Last\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Current\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount\nBeing Paid', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Eligible Discount/\n(Late Fee **)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'}]);
  //
  //   notNormalStatusWithArrearsArray.push([{text: 'Sr.\nNo', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Consumer\nInformation', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Parameter', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Last\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Current\nMonth', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Amount\nBeing Paid', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Eligible Discount/\n(Late Fee **)', style: 'abstractTableHeader', alignment: 'center'},
  //     {text: 'Budget Code', style: 'abstractTableHeader', alignment: 'center'}]);
  //
  //   let normalStatusWithoutArrearsTotalPaidAmount = [{text:'Sub Total (A)' , colSpan: 4, rowSpan:3, alignment: 'center', bold: true}, '', '', '', {text:'Total Paid', bold:true}, {text: data.normalStatusWithoutArrears.totalPaidAmount, bold:true}, '',
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let normalStatusWithoutArrearsTotalPromptDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'Prompt Discount', bold:true}, '-', {text: data.normalStatusWithoutArrears.totalPromptAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let normalStatusWithoutArrearsTotalLateDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'DPC', bold:true}, '-', {text: data.normalStatusWithoutArrears.totalLateAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //
  //   let normalStatusWithArrearsTotalPaidAmount = [{text:'Sub Total (B)' , colSpan: 4, rowSpan:3, alignment: 'center', bold: true}, '', '', '', {text:'Total Paid', bold:true}, {text: data.normalStatusWithArrears.totalPaidAmount, bold:true}, '',
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let normalStatusWithArrearsTotalPromptDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'Prompt Discount', bold:true}, '-', {text: data.normalStatusWithArrears.totalPromptAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let normalStatusWithArrearsTotalLateDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'DPC', bold:true}, '-', {text: data.normalStatusWithArrears.totalLateAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //
  //   let notNormalStatusWithoutArrearsTotalPaidAmount = [{text:'Sub Total (C)' , colSpan: 4, rowSpan:3, alignment: 'center', bold: true}, '', '', '', {text:'Total Paid', bold:true}, {text: data.notNormalStatusWithoutArrears.totalPaidAmount, bold:true}, '',
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let notNormalStatusWithoutArrearsTotalPromptDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'Prompt Discount', bold:true}, '-', {text: data.notNormalStatusWithoutArrears.totalPromptAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let notNormalStatusWithoutArrearsTotalLateDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'DPC', bold:true}, '-', {text: data.notNormalStatusWithoutArrears.totalLateAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //
  //
  //   let notNormalStatusWithArrearsTotalPaidAmount = [{text:'Sub Total (D)' , colSpan: 4, rowSpan:3, alignment: 'center', bold: true}, '', '', '', {text:'Total Paid', bold:true}, {text: data.notNormalStatusWithArrears.totalPaidAmount, bold:true}, '',
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let notNormalStatusWithArrearsTotalPromptDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'Prompt Discount', bold:true}, '-', {text: data.notNormalStatusWithArrears.totalPromptAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //   let notNormalStatusWithArrearsTotalLateDiscount = [{text:'' , colSpan: 4, rowSpan:3}, '', '', '', {text:'DPC', bold:true}, '-', {text: data.notNormalStatusWithArrears.totalLateAmount, bold:true},
  //     {text:'' , colSpan: 1, rowSpan:3}];
  //
  //
  //   data.normalStatusWithoutArrears.consumerSummary.map((item, index) => {
  //     // let billFor = [{rowSpan: 5, text: index + 1},
  //     //   {rowSpan: 5, text: [
  //     //     {text: item.consumerNumber, bold: true, fontSize: 9},
  //     //     {text: '\nBU:' + item.billingUnitNumber},
  //     //     {text: '\nBill for:\n' + item.billMonth},
  //     //     {rowSpan: 5, text: '\nMeter Status:\n'},
  //     //     {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //     //   ]},
  //     //   'Bill For', item.lastMonthBillMonth, item.billMonth,
  //     //   {rowSpan: 5, text: item.billedAmount},
  //     //   {rowSpan: 5, text: item.promptOrLateAmount},
  //     //   {rowSpan: 5, text: item.budgetCode}
  //     // ];
  //     // let fromDate = ['', '', {text:'From Date', fontSize: 9}, item.lastMonthPreviousMeterReadingDate, item.previousMeterReadingDate, '', '', ''];
  //     // let toDate = ['', '', {text:'To Date', fontSize: 9}, item.lastMonthCurrentMeterReadingDate, item.currentMeterReadingDate, '', '', ''];
  //     // let meterReading = ['', '', {text:'Meter Reading', fontSize: 9}, item.previousReading, item.currentReading, '', '', ''];
  //     // let unitConsumed = ['', '', {text:'Units Consumed', fontSize: 9}, item.lastMonthConsumedUnits, item.consumedUnits, '', '', ''];
  //     let unitConsumed = [{rowSpan: 5, text: index + 1},
  //       {rowSpan: 5, text: [
  //         {text: item.consumerNumber, bold: true, fontSize: 9},
  //         {text: '\nBU:' + item.billingUnitNumber},
  //         {text: '\nBill for:\n' + item.billMonth},
  //         {rowSpan: 5, text: '\nMeter Status:\n'},
  //         {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //       ]},
  //
  //       // billDueDate & promptPaymentDate date added on abstract version A
  //       // T1471: Add Prompt Payment Date and Due Date in abstract (abstract version A)
  //       // developer: Manohar
  //       // date: 16/7/18
  //
  //       {text:'Units Consumed', fontSize: 9},item.lastMonthConsumedUnits, item.consumedUnits,
  //       // {rowSpan: 5, text: item.paidAmount},
  //       // {rowSpan: 5, text: item.promptOrLateAmount},
  //       {rowSpan: 5, text: item.paidAmount + '\n' + (item.billDueDate ? ('\nDue Date:\n' + item.billDueDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.promptOrLateAmount + '\n' + (item.promptPaymentDate ? ('\nPrompt Date:\n' + item.promptPaymentDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.budgetCode}
  //     ];
  //     let changeLastMonth = ['', '', {text:'Month Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastMonthUnits, '', '', ''];
  //     let changeLastYear = ['', '', {text:'Year Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastYearUnits, '', '', ''];
  //     let arrears = ['', '', {text:'Arrears', fontSize: 9}, {text: item.lastMonthArrears, italics:true}, {text: item.arrears, italics:true}, '', '', ''];
  //     let totalBillAmount = ['', '', {text:'Total Bill Amount', fontSize: 9}, {text: item.lastMonthBilledAmount, italics:true}, {text:item.billedAmount, bold:true, fontSize: 9}, '', '', ''];
  //
  //     /* T1634: 1st Page Abstract PDF is not displayed properly if more than 8 bills are present in billform.
  //       developer: Manohar
  //       date: 16/7/18
  //       comment: In abstract version A only 7 consumers summary are display on single page. */
  //
  //     if (((index !== 0) && (data.normalStatusWithoutArrears.consumerSummary.length > 6 ) && (index % 7  === 0)) || ((data.normalStatusWithoutArrears.consumerSummary.length === 8 ) && (index === 7))) {
  //       normalStatusWithoutArrearsArray.push(['', '', '', '', {text:'Carried Forward', bold:true},
  //         {text: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPaidAmountAsPerPage.toFixed(2)), bold:true}, '', '']);
  //       totalPaidAmountAsPerPage = 0;
  //       normalStatusWithoutArrearsArray.push([{text: 'Sr.\nNo', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Consumer\nInformation', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Parameter', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Last\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Current\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Amount\nBeing Paid', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Eligible Discount/\n(Late Fee **)', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Budget Code', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'}
  //       ]);
  //
  //     }
  //
  //     totalPaidAmountAsPerPage = totalPaidAmountAsPerPage + item.paidAmountForPDF;
  //     // abstractDataArray.push(billFor);
  //     // abstractDataArray.push(fromDate);
  //     // abstractDataArray.push(toDate);
  //     // abstractDataArray.push(meterReading);
  //     normalStatusWithoutArrearsArray.push(unitConsumed);
  //     normalStatusWithoutArrearsArray.push(changeLastMonth);
  //     normalStatusWithoutArrearsArray.push(changeLastYear);
  //     normalStatusWithoutArrearsArray.push(arrears);
  //     normalStatusWithoutArrearsArray.push(totalBillAmount);
  //     if ((!data.normalStatusWithoutArrears.consumerSummary.length || data.normalStatusWithoutArrears.consumerSummary.length === index + 1)) {
  //       normalStatusWithoutArrearsArray.push(normalStatusWithoutArrearsTotalPaidAmount);
  //       normalStatusWithoutArrearsArray.push(normalStatusWithoutArrearsTotalPromptDiscount);
  //       normalStatusWithoutArrearsArray.push(normalStatusWithoutArrearsTotalLateDiscount);
  //     }
  //   });
  //
  //   data.normalStatusWithArrears.consumerSummary.map((item, index) => {
  //     // let billFor = [{rowSpan: 5, text: index + 1},
  //     //   {rowSpan: 5, text: [
  //     //     {text: item.consumerNumber, bold: true, fontSize: 9},
  //     //     {text: '\nBU:' + item.billingUnitNumber},
  //     //     {text: '\nBill for:\n' + item.billMonth},
  //     //     {rowSpan: 5, text: '\nMeter Status:\n'},
  //     //     {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //     //   ]},
  //     //   'Bill For', item.lastMonthBillMonth, item.billMonth,
  //     //   {rowSpan: 5, text: item.billedAmount},
  //     //   {rowSpan: 5, text: item.promptOrLateAmount},
  //     //   {rowSpan: 5, text: item.budgetCode}
  //     // ];
  //     // let fromDate = ['', '', {text:'From Date', fontSize: 9}, item.lastMonthPreviousMeterReadingDate, item.previousMeterReadingDate, '', '', ''];
  //     // let toDate = ['', '', {text:'To Date', fontSize: 9}, item.lastMonthCurrentMeterReadingDate, item.currentMeterReadingDate, '', '', ''];
  //     // let meterReading = ['', '', {text:'Meter Reading', fontSize: 9}, item.previousReading, item.currentReading, '', '', ''];
  //     // let unitConsumed = ['', '', {text:'Units Consumed', fontSize: 9}, item.lastMonthConsumedUnits, item.consumedUnits, '', '', ''];
  //     let unitConsumed = [{rowSpan: 5, text: index + 1},
  //       {rowSpan: 5, text: [
  //         {text: item.consumerNumber, bold: true, fontSize: 9},
  //         {text: '\nBU:' + item.billingUnitNumber},
  //         {text: '\nBill for:\n' + item.billMonth},
  //         {rowSpan: 5, text: '\nMeter Status:\n'},
  //         {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //       ]},
  //
  //       // billDueDate & promptPaymentDate date added on abstract version A
  //       // T1471: Add Prompt Payment Date and Due Date in abstract (abstract version A)
  //       // developer: Manohar
  //       // date: 16/7/18
  //
  //       {text:'Units Consumed', fontSize: 9},item.lastMonthConsumedUnits, item.consumedUnits,
  //       // {rowSpan: 5, text: item.paidAmount},
  //       // {rowSpan: 5, text: item.promptOrLateAmount},
  //       {rowSpan: 5, text: item.paidAmount + '\n' + (item.billDueDate ? ('\nDue Date:\n' + item.billDueDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.promptOrLateAmount + '\n' + (item.promptPaymentDate ? ('\nPrompt Date:\n' + item.promptPaymentDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.budgetCode}
  //     ];
  //     let changeLastMonth = ['', '', {text:'Month Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastMonthUnits, '', '', ''];
  //     let changeLastYear = ['', '', {text:'Year Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastYearUnits, '', '', ''];
  //     let arrears = ['', '', {text:'Arrears', fontSize: 9}, {text: item.lastMonthArrears, italics:true}, {text: item.arrears, italics:true}, '', '', ''];
  //     let totalBillAmount = ['', '', {text:'Total Bill Amount', fontSize: 9}, {text: item.lastMonthBilledAmount, italics:true}, {text:item.billedAmount, bold:true, fontSize: 9}, '', '', ''];
  //
  //     if (((index !== 0) && (data.normalStatusWithArrears.consumerSummary.length > 6 ) && (index % 7  === 0)) || ((data.normalStatusWithArrears.consumerSummary.length === 8 ) && (index === 7))) {
  //       normalStatusWithArrearsArray.push(['', '', '', '', {text:'Carried Forward', bold:true},
  //         {text: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPaidAmountAsPerPage.toFixed(2)), bold:true}, '', '']);
  //       totalPaidAmountAsPerPage = 0;
  //       normalStatusWithArrearsArray.push([{text: 'Sr.\nNo', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Consumer\nInformation', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Parameter', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Last\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Current\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Amount\nBeing Paid', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Eligible Discount/\n(Late Fee **)', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Budget Code', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'}
  //       ]);
  //
  //     }
  //
  //     totalPaidAmountAsPerPage = totalPaidAmountAsPerPage + item.paidAmountForPDF;
  //     // normalStatusWithArrearsArray.push(billFor);
  //     // normalStatusWithArrearsArray.push(fromDate);
  //     // normalStatusWithArrearsArray.push(toDate);
  //     // normalStatusWithArrearsArray.push(meterReading);
  //     normalStatusWithArrearsArray.push(unitConsumed);
  //     normalStatusWithArrearsArray.push(changeLastMonth);
  //     normalStatusWithArrearsArray.push(changeLastYear);
  //     normalStatusWithArrearsArray.push(arrears);
  //     normalStatusWithArrearsArray.push(totalBillAmount);
  //     if ((!data.normalStatusWithArrears.consumerSummary.length || data.normalStatusWithArrears.consumerSummary.length === index + 1)) {
  //       normalStatusWithArrearsArray.push(normalStatusWithArrearsTotalPaidAmount);
  //       normalStatusWithArrearsArray.push(normalStatusWithArrearsTotalPromptDiscount);
  //       normalStatusWithArrearsArray.push(normalStatusWithArrearsTotalLateDiscount);
  //     }
  //   });
  //
  //   data.notNormalStatusWithoutArrears.consumerSummary.map((item, index) => {
  //     // let billFor = [{rowSpan: 5, text: index + 1},
  //     //   {rowSpan: 5, text: [
  //     //     {text: item.consumerNumber, bold: true, fontSize: 9},
  //     //     {text: '\nBU:' + item.billingUnitNumber},
  //     //     {text: '\nBill for:\n' + item.billMonth},
  //     //     {rowSpan: 5, text: '\nMeter Status:\n'},
  //     //     {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //     //   ]},
  //     //   'Bill For', item.lastMonthBillMonth, item.billMonth,
  //     //   {rowSpan: 5, text: item.billedAmount},
  //     //   {rowSpan: 5, text: item.promptOrLateAmount},
  //     //   {rowSpan: 5, text: item.budgetCode}
  //     // ];
  //     // let fromDate = ['', '', {text:'From Date', fontSize: 9}, item.lastMonthPreviousMeterReadingDate, item.previousMeterReadingDate, '', '', ''];
  //     // let toDate = ['', '', {text:'To Date', fontSize: 9}, item.lastMonthCurrentMeterReadingDate, item.currentMeterReadingDate, '', '', ''];
  //     // let meterReading = ['', '', {text:'Meter Reading', fontSize: 9}, item.previousReading, item.currentReading, '', '', ''];
  //     // let unitConsumed = ['', '', {text:'Units Consumed', fontSize: 9}, item.lastMonthConsumedUnits, item.consumedUnits, '', '', ''];
  //     let unitConsumed = [{rowSpan: 5, text: index + 1},
  //       {rowSpan: 5, text: [
  //         {text: item.consumerNumber, bold: true, fontSize: 9},
  //         {text: '\nBU:' + item.billingUnitNumber},
  //         {text: '\nBill for:\n' + item.billMonth},
  //         {rowSpan: 5, text: '\nMeter Status:\n'},
  //         {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //       ]},
  //
  //       // billDueDate & promptPaymentDate date added on abstract version A
  //       // T1471: Add Prompt Payment Date and Due Date in abstract (abstract version A)
  //       // developer: Manohar
  //       // date: 16/7/18
  //
  //       {text:'Units Consumed', fontSize: 9},item.lastMonthConsumedUnits, item.consumedUnits,
  //       // {rowSpan: 5, text: item.paidAmount},
  //       // {rowSpan: 5, text: item.promptOrLateAmount},
  //       {rowSpan: 5, text: item.paidAmount + '\n' + (item.billDueDate ? ('\nDue Date:\n' + item.billDueDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.promptOrLateAmount + '\n' + (item.promptPaymentDate ? ('\nPrompt Date:\n' + item.promptPaymentDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.budgetCode}
  //     ];
  //     let changeLastMonth = ['', '', {text:'Month Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastMonthUnits, '', '', ''];
  //     let changeLastYear = ['', '', {text:'Year Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastYearUnits, '', '', ''];
  //     let arrears = ['', '', {text:'Arrears', fontSize: 9}, {text: item.lastMonthArrears, italics:true}, {text: item.arrears, italics:true}, '', '', ''];
  //     let totalBillAmount = ['', '', {text:'Total Bill Amount', fontSize: 9}, {text: item.lastMonthBilledAmount, italics:true}, {text:item.billedAmount, bold:true, fontSize: 9}, '', '', ''];
  //
  //     if (((index !== 0) && (data.notNormalStatusWithoutArrears.consumerSummary.length > 6 ) && (index % 7  === 0)) || ((data.notNormalStatusWithoutArrears.consumerSummary.length === 8 ) && (index === 7))) {
  //       notNormalStatusWithoutArrearsArray.push(['', '', '', '', {text:'Carried Forward', bold:true},
  //         {text: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPaidAmountAsPerPage.toFixed(2)), bold:true}, '', '']);
  //       totalPaidAmountAsPerPage = 0;
  //       notNormalStatusWithoutArrearsArray.push([{text: 'Sr.\nNo', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Consumer\nInformation', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Parameter', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Last\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Current\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Amount\nBeing Paid', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Eligible Discount/\n(Late Fee **)', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Budget Code', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'}
  //       ]);
  //
  //     }
  //
  //     totalPaidAmountAsPerPage = totalPaidAmountAsPerPage + item.paidAmountForPDF;
  //     // notNormalStatusWithoutArrearsArray.push(billFor);
  //     // notNormalStatusWithoutArrearsArray.push(fromDate);
  //     // notNormalStatusWithoutArrearsArray.push(toDate);
  //     // notNormalStatusWithoutArrearsArray.push(meterReading);
  //     notNormalStatusWithoutArrearsArray.push(unitConsumed);
  //     notNormalStatusWithoutArrearsArray.push(changeLastMonth);
  //     notNormalStatusWithoutArrearsArray.push(changeLastYear);
  //     notNormalStatusWithoutArrearsArray.push(arrears);
  //     notNormalStatusWithoutArrearsArray.push(totalBillAmount);
  //     if ((!data.notNormalStatusWithoutArrears.consumerSummary.length || data.notNormalStatusWithoutArrears.consumerSummary.length === index + 1)) {
  //       notNormalStatusWithoutArrearsArray.push(notNormalStatusWithoutArrearsTotalPaidAmount);
  //       notNormalStatusWithoutArrearsArray.push(notNormalStatusWithoutArrearsTotalPromptDiscount);
  //       notNormalStatusWithoutArrearsArray.push(notNormalStatusWithoutArrearsTotalLateDiscount);
  //     }
  //   });
  //
  //   data.notNormalStatusWithArrears.consumerSummary.map((item, index) => {
  //     // let billFor = [{rowSpan: 5, text: index + 1},
  //     //   {rowSpan: 5, text: [
  //     //     {text: item.consumerNumber, bold: true, fontSize: 9},
  //     //     {text: '\nBU:' + item.billingUnitNumber},
  //     //     {text: '\nBill for:\n' + item.billMonth},
  //     //     {rowSpan: 5, text: '\nMeter Status:\n'},
  //     //     {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //     //   ]},
  //     //   'Bill For', item.lastMonthBillMonth, item.billMonth,
  //     //   {rowSpan: 5, text: item.billedAmount},
  //     //   {rowSpan: 5, text: item.promptOrLateAmount},
  //     //   {rowSpan: 5, text: item.budgetCode}
  //     // ];
  //     // let fromDate = ['', '', {text:'From Date', fontSize: 9}, item.lastMonthPreviousMeterReadingDate, item.previousMeterReadingDate, '', '', ''];
  //     // let toDate = ['', '', {text:'To Date', fontSize: 9}, item.lastMonthCurrentMeterReadingDate, item.currentMeterReadingDate, '', '', ''];
  //     // let meterReading = ['', '', {text:'Meter Reading', fontSize: 9}, item.previousReading, item.currentReading, '', '', ''];
  //     // let unitConsumed = ['', '', {text:'Units Consumed', fontSize: 9}, item.lastMonthConsumedUnits, item.consumedUnits, '', '', ''];
  //     let unitConsumed = [{rowSpan: 5, text: index + 1},
  //       {rowSpan: 5, text: [
  //         {text: item.consumerNumber, bold: true, fontSize: 9},
  //         {text: '\nBU:' + item.billingUnitNumber},
  //         {text: '\nBill for:\n' + item.billMonth},
  //         {rowSpan: 5, text: '\nMeter Status:\n'},
  //         {rowSpan: 5, text: item.meterStatus, bold:true, fontSize: 9}
  //       ]},
  //
  //       // billDueDate & promptPaymentDate date added on abstract version A
  //       // T1471: Add Prompt Payment Date and Due Date in abstract (abstract version A)
  //       // developer: Manohar
  //       // date: 16/7/18
  //
  //       {text:'Units Consumed', fontSize: 9},item.lastMonthConsumedUnits, item.consumedUnits,
  //       // {rowSpan: 5, text: item.paidAmount},
  //       // {rowSpan: 5, text: item.promptOrLateAmount},
  //       {rowSpan: 5, text: item.paidAmount + '\n' + (item.billDueDate ? ('\nDue Date:\n' + item.billDueDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.promptOrLateAmount + '\n' + (item.promptPaymentDate ? ('\nPrompt Date:\n' + item.promptPaymentDate) : ''), italics:true},
  //       {rowSpan: 5, text: item.budgetCode}
  //     ];
  //     let changeLastMonth = ['', '', {text:'Month Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastMonthUnits, '', '', ''];
  //     let changeLastYear = ['', '', {text:'Year Before', fontSize: 9 , alignment: 'right'}, 'NA', item.lastYearUnits, '', '', ''];
  //     let arrears = ['', '', {text:'Arrears', fontSize: 9}, {text: item.lastMonthArrears, italics:true}, {text: item.arrears, italics:true}, '', '', ''];
  //     let totalBillAmount = ['', '', {text:'Total Bill Amount', fontSize: 9}, {text: item.lastMonthBilledAmount, italics:true}, {text:item.billedAmount, bold:true, fontSize: 9}, '', '', ''];
  //
  //     if (((index !== 0) && (data.notNormalStatusWithArrears.consumerSummary.length > 6 ) && (index % 7  === 0)) || ((data.notNormalStatusWithArrears.consumerSummary.length === 8 ) && (index === 7))) {
  //       notNormalStatusWithArrearsArray.push(['', '', '', '', {text:'Carried Forward', bold:true},
  //         {text: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPaidAmountAsPerPage.toFixed(2)), bold:true}, '', '']);
  //       totalPaidAmountAsPerPage = 0;
  //       notNormalStatusWithArrearsArray.push([{text: 'Sr.\nNo', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Consumer\nInformation', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Parameter', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Last\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Current\nMonth', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Amount\nBeing Paid', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Eligible Discount/\n(Late Fee **)', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'},
  //         {text: 'Budget Code', pageBreak:'before', style: 'abstractTableHeader', alignment: 'center'}
  //       ]);
  //
  //     }
  //
  //     totalPaidAmountAsPerPage = totalPaidAmountAsPerPage + item.paidAmountForPDF;
  //     // notNormalStatusWithArrearsArray.push(billFor);
  //     // notNormalStatusWithArrearsArray.push(fromDate);
  //     // notNormalStatusWithArrearsArray.push(toDate);
  //     // notNormalStatusWithArrearsArray.push(meterReading);
  //     notNormalStatusWithArrearsArray.push(unitConsumed);
  //     notNormalStatusWithArrearsArray.push(changeLastMonth);
  //     notNormalStatusWithArrearsArray.push(changeLastYear);
  //     notNormalStatusWithArrearsArray.push(arrears);
  //     notNormalStatusWithArrearsArray.push(totalBillAmount);
  //     if ((!data.notNormalStatusWithArrears.consumerSummary.length || data.notNormalStatusWithArrears.consumerSummary.length === index + 1)) {
  //       notNormalStatusWithArrearsArray.push(notNormalStatusWithArrearsTotalPaidAmount);
  //       notNormalStatusWithArrearsArray.push(notNormalStatusWithArrearsTotalPromptDiscount);
  //       notNormalStatusWithArrearsArray.push(notNormalStatusWithArrearsTotalLateDiscount);
  //     }
  //   });
  //
  //   if (!data.normalStatusWithoutArrears.consumerSummary.length) {
  //     normalStatusWithoutArrearsArray.push(normalStatusWithoutArrearsTotalPaidAmount);
  //     normalStatusWithoutArrearsArray.push(normalStatusWithoutArrearsTotalPromptDiscount);
  //     normalStatusWithoutArrearsArray.push(normalStatusWithoutArrearsTotalLateDiscount);
  //   }
  //
  //   if (!data.normalStatusWithArrears.consumerSummary.length) {
  //     normalStatusWithArrearsArray.push(normalStatusWithArrearsTotalPaidAmount);
  //     normalStatusWithArrearsArray.push(normalStatusWithArrearsTotalPromptDiscount);
  //     normalStatusWithArrearsArray.push(normalStatusWithArrearsTotalLateDiscount);
  //   }
  //
  //   if (!data.notNormalStatusWithoutArrears.consumerSummary.length) {
  //     notNormalStatusWithoutArrearsArray.push(notNormalStatusWithoutArrearsTotalPaidAmount);
  //     notNormalStatusWithoutArrearsArray.push(notNormalStatusWithoutArrearsTotalPromptDiscount);
  //     notNormalStatusWithoutArrearsArray.push(notNormalStatusWithoutArrearsTotalLateDiscount);
  //   }
  //
  //   if (!data.notNormalStatusWithArrears.consumerSummary.length) {
  //     notNormalStatusWithArrearsArray.push(notNormalStatusWithArrearsTotalPaidAmount);
  //     notNormalStatusWithArrearsArray.push(notNormalStatusWithArrearsTotalPromptDiscount);
  //     notNormalStatusWithArrearsArray.push(notNormalStatusWithArrearsTotalLateDiscount);
  //   }
  //
  //   abstractVersionAData.normalStatusWithoutArrears = normalStatusWithoutArrearsArray;
  //   abstractVersionAData.normalStatusWithArrears = normalStatusWithArrearsArray;
  //   abstractVersionAData.notNormalStatusWithoutArrears = notNormalStatusWithoutArrearsArray;
  //   abstractVersionAData.notNormalStatusWithArrears = notNormalStatusWithArrearsArray;
  //
  //   this.setState({abstractVersionAData});
  //
  //
  //   if (abstractVersionAData) this.makePDFForAbstractVersionA(data, abstractVersionAData, dataUrl);
  // }
  //
  // makePDFForAbstractVersionA(dataPDF ,abstractVersionAData, dataUrl) {
  //   let userName = this.state.userInfo.name;
  //   const currentDate = formatDateTime(new Date(), true);
  //   const billFormCreationDate = formatDateTime(dataPDF.billFormCreatedDateForPDF);
  //   pdfMake.fonts = PDFSTYLE.fonts;
  //   let docDefinition = {
  //     pageSize: PDFSTYLE.pageSetup.pageSize,
  //     pageOrientation: PDFSTYLE.pageSetup.pageOrientationPortrait,
  //     pageMargins: PDFSTYLE.pageSetup.abstractPageMargins,
  //
  //     // header() {
  //     //   return { style: 'pageHeader',
  //     //     columns: [
  //     //       { text: currentDate, alignment: 'right'}
  //     //     ]};
  //     // },
  //
  //     footer(currentPage, pageCount) { return { style: 'pageFooter',
  //       columns: [{
  //         text:[
  //           { text: 'Created by Powerdek'},
  //           { text: ' TM', fontSize:5}
  //         ]
  //       },
  //
  //       { text: currentDate + ' By ' + userName + ' | ' + currentPage.toString() + ' of ' + pageCount, alignment: 'right'}
  //       ]};},
  //
  //     content: [
  //       {
  //         columns: [
  //           {
  //             image: dataUrl,
  //             width: 90,
  //             height: 60
  //           },
  //           {
  //             width: 120,
  //             margin: [5, 5, 5, 5],
  //             text: dataPDF.companyName + '\n(' + dataPDF.departmentName + ' DEPT.)',
  //             fontSize: 11,
  //             alignment: 'center'
  //           },
  //           {
  //             width: 90,
  //             fontSize: 9,
  //             alignment: 'center',
  //             margin: [5, 5, 5, 5],
  //             text: [
  //               {text: 'ELECTRICITY \nBILLS PAYMENT\n'},
  //               {text: 'ABSTRACT', bold: true}
  //             ]
  //           },
  //           {
  //             width: '*',
  //             style: 'tableExample',
  //             fontSize: 9,
  //             table: {
  //               body: [
  //                 ['Bill Form No.', dataPDF.customerBillFormNumber],
  //                 ['Bill Form Creation Date', billFormCreationDate],
  //                 ['Being Paid to', dataPDF.billFormBeingPaidTo]
  //               ]
  //             }
  //           }
  //         ]
  //       },
  //       { margin: [0, 5, 0, 0],
  //         fontSize: 8,
  //         text: '** Effective Eligible Discount / Late Fee is shown considering Bill Form creation date. It may vary depending upon the actual date of payment effect into ' + dataPDF.billFormBeingPaidTo + ' account.'
  //       },
  //       { margin: [0, 3, 0, 3],
  //         fontSize: 11,
  //         bold:true,
  //         text: '(A) : Normal Meter Status Without Arrears'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 9,
  //         margin: [0, 3, 0, 3],
  //         table: {
  //           widths: ['auto', 65,70,68,68,70,60,58],
  //           headerRows: 0,
  //           // keepWithHeaderRows: 1,
  //           body: abstractVersionAData.normalStatusWithoutArrears
  //         }
  //       },
  //
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 11,
  //         bold:true,
  //         pageBreak: 'before',
  //         text: '(B) : Normal Meter Status with Arrears'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 9,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           widths: ['auto', 65,70,68,68,70,60,58],
  //           headerRows: 0,
  //           // keepWithHeaderRows: 1,
  //           body: abstractVersionAData.normalStatusWithArrears
  //         }
  //       },
  //
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 11,
  //         bold:true,
  //         pageBreak: 'before',
  //         text: '(C) : Not Normal Meter Status without Arrears'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 9,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           widths: ['auto', 65,70,68,68,70,60,58],
  //           headerRows: 0,
  //           // keepWithHeaderRows: 1,
  //           body: abstractVersionAData.notNormalStatusWithoutArrears
  //         }
  //       },
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 11,
  //         bold:true,
  //         pageBreak: 'before',
  //         text: '(D) : Not Normal Meter Status with Arrears'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 9,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           widths: ['auto', 65,70,68,68,70,60,58],
  //           headerRows: 0,
  //           // keepWithHeaderRows: 1,
  //           body: abstractVersionAData.notNormalStatusWithArrears
  //         }
  //       },
  //       { margin: [0, 5, 0, 5],
  //         fontSize: 11,
  //         bold:true,
  //         pageBreak: 'before',
  //         text: '(E) : BillForm Summary'
  //       },
  //       {
  //         style: 'tableExample',
  //         fontSize: 9,
  //         margin: [0, 5, 0, 5],
  //         table: {
  //           body: [
  //             [{text:'Category', bold:true},{text:'No of bills', bold:true},{text:'Amount To Be Paid', bold:true},{text:'Prompt Payment Discount', bold:true},{text:'Delayed Payment Charges', bold:true}],
  //             [{text:'NORMAL without arrears', bold:true}, dataPDF.normalStatusWithoutArrears.noOfBills,
  //               {text: dataPDF.normalStatusWithoutArrears.totalPaidAmount, italics:true},
  //               {text: dataPDF.normalStatusWithoutArrears.totalPromptAmount, italics:true},
  //               {text: dataPDF.normalStatusWithoutArrears.totalLateAmount, italics:true}
  //             ],
  //             [{text:'NORMAL with arrears', bold:true}, dataPDF.normalStatusWithArrears.noOfBills,
  //               {text: dataPDF.normalStatusWithArrears.totalPaidAmount, italics:true},
  //               {text: dataPDF.normalStatusWithArrears.totalPromptAmount, italics:true},
  //               {text: dataPDF.normalStatusWithArrears.totalLateAmount, italics:true}
  //             ],
  //             [{text:'Not NORMAL without arrears', bold:true}, dataPDF.notNormalStatusWithoutArrears.noOfBills,
  //               {text: dataPDF.notNormalStatusWithoutArrears.totalPaidAmount, italics:true},
  //               {text: dataPDF.notNormalStatusWithoutArrears.totalPromptAmount, italics:true},
  //               {text: dataPDF.notNormalStatusWithoutArrears.totalLateAmount, italics:true}
  //             ],
  //             [{text:'Not NORMAL with arrears', bold:true}, dataPDF.notNormalStatusWithArrears.noOfBills,
  //               {text: dataPDF.notNormalStatusWithArrears.totalPaidAmount, italics:true},
  //               {text: dataPDF.notNormalStatusWithArrears.totalPromptAmount, italics:true},
  //               {text: dataPDF.notNormalStatusWithArrears.totalLateAmount, italics:true}
  //             ],
  //             [{text:'Total', bold:true}, dataPDF.totalSummary.totalNoOfBills,
  //               {text: dataPDF.totalSummary.totalPaidAmount, italics:true},
  //               {text: dataPDF.totalSummary.totalPromptAmount, italics:true},
  //               {text: dataPDF.totalSummary.totalLateAmount, italics:true}
  //             ]
  //           ]
  //         }
  //       }
  //     ],
  //     styles: PDFSTYLE.styles
  //   };
  //   // open the PDF in a new window
  //   pdfMake.createPdf(docDefinition).open();
  //   // print the PDF
  //   // pdfMake.createPdf(docDefinition).print();
  //   // download the PDF
  //   // pdfMake.createPdf(docDefinition).download('powerdekPerformanceAssurence.pdf');
  // }

  /* T1442, T1472 : If bill form contains more than 2 billing units, then they are displayed in a modal popup
     Developer : Pallavi
     Date : 06/07/2018
  */
  toggleMultipleBUModal() {
    this.setState({isMultipleBUModalOpen: !this.state.isMultipleBUModalOpen});
  }

  /* T1480 : Modal popup designed to display actions for supporting documents
     Developer : Pallavi
     Date : 13/07/2018
  */
  togglePossibleActionsModal() {
    this.setState({isPossibleActionsModalOpen: !this.state.isPossibleActionsModalOpen});
  }

  openSelectedDocument(selectedDocument) {
    this.setState({isPossibleActionsModalOpen: !this.state.isPossibleActionsModalOpen});

    this.togglePrintPreview(selectedDocument);
  }

  render({}, { billForm, taskDetails, commaSeparatedDiscomDivisions, isClientAdmin, connectionTypes, budgetDetails}) {

    return (
      <div>
        <section class="box" style="min-height:3.5rem;">
          <div class="row">
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6 no-padding">
              <span style="font-size: 1.2rem;"># {billForm.customerBillFormNumber || billForm.runningNumber}</span>
            </div>
          </div>
        </section>
        <section class="box">
          <div class="row">
            <div class="column has-text-right">
              {
                (billForm.status === 'draft') && !isClientAdmin &&
                (billForm.createdBy.toString() === this.state.loggedUserID.toString()) &&
                (<span>

                  {
                    this.state.billFormQuorum === 0 &&
                  (
                    <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForFurtherReview.bind(this)}>
                      <span><em style="font-size:1em;color:limegreen" class="icon icon icon-check-square"/></span>
                      <span style="display: block; line-height: 1;">Approve</span></div>
                  )
                  }
                  {
                    this.state.billFormQuorum !== 0 &&
                  (
                    <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForReview.bind(this)}>
                      <span><em style="font-size:1em;color:limegreen" class="icon icon icon-check-square"/></span>
                      <span style="display: block; line-height: 1;">Approve</span></div>
                  )
                  }

                </span>)
              }

              {
                billForm.status === 'rejected' && !isClientAdmin && taskDetails.assignedUserID &&
                (taskDetails.assignedUserID.toString() === this.state.loggedUserID.toString()
                  || billForm.createdBy.toString() === this.state.loggedUserID.toString()) &&
                (<span>
                  {
                    this.state.billFormQuorum === 0 &&
                  (
                    <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForFurtherReview.bind(this)}>
                      <span><em style="font-size:1em;color:limegreen" class="icon icon icon-check-square"/></span>
                      <span style="display: block; line-height: 1;">Approve</span></div>
                  )
                  }
                  {
                    this.state.billFormQuorum !== 0 &&
                    <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForReview.bind(this)}>
                      <span><em style="font-size:1em;color:limegreen" class="icon icon icon-check-square"/></span>
                      <span style="display: block; line-height: 1;">Submit for Review</span></div>
                  }
                </span>
                )
              }

              {
                billForm.status === 'submittedforreview' && !isClientAdmin &&
                (
                  <span>
                    {
                      (taskDetails.assignedUserID.toString() === this.state.loggedUserID.toString()) &&
                      (this.state.isApproveButtonVisible) && (taskDetails.status === 'underreview') &&
                      (
                        <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForFurtherReview.bind(this)}>
                          <span><em style="font-size:1em;color:limegreen" class="icon icon icon-check-square"/></span>
                          <span style="display: block; line-height: 1;">Approve</span></div>
                      )
                    }
                    {
                      (taskDetails.assignedUserID.toString() === this.state.loggedUserID.toString()) &&
                      this.state.isSubmitForReviewButtonVisible && (
                        <div class="request-tile request-tile-clear" onClick={this.toggleSubmitForReview.bind(this)}>
                          <span><em style="font-size:1em;color:limegreen" class="icon icon icon-check-square"/></span>
                          <span style="display: block; line-height: 1;">Approve</span></div>
                      )
                    }
                    {
                      (taskDetails.assignedUserID === this.state.loggedUserID) &&
                      (taskDetails.status === 'underreview') &&(
                        <div class="request-tile request-tile-clear" onClick={this.toggleRejectModal.bind(this)}>
                          <span><em style="font-size:1em;color:red" class="icon icon-cancel-squared"/></span>
                          <span style="display: block; line-height: 1;">Reject</span></div>
                      )
                    }
                  </span>
                )
              }
              {
                (billForm.updatedBy && billForm.updatedBy.toString() === this.state.loggedUserID.toString())
               && (billForm.status === 'submittedforreview' && billForm.status !== 'rejected') &&
                <div class="request-tile request-tile-clear" onClick={this.onChangeReviewerClick.bind(this)}>
                  <span><em style="font-size:1em;color:#808080" class="icon icon-pencil-square-o"/></span>
                  <span style="display: block; line-height: 1;">Change Reviewer</span></div>
              }
            </div>
          </div>
        </section>
        <section class="box">
          <div class="row">
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">
              <label style="width:100%;">{this.state.billFormDisplayName} Summary</label>
              <hr class="popup-hr" />
              <div class="column no-padding">
                <div class={`table-responsive`}>
                  <table class="m-b-10 no-border-table">
                    <tbody>
                      <tr>
                        <td style="width: 130px;">Billing Unit(s)</td>
                        <td>
                          {
                            this.state.discomDivisions.length <= 2 && (
                              <span style="text-transform:capitalize">
                                <strong>{
                                  (commaSeparatedDiscomDivisions || 'Not Available')
                                }</strong>
                              </span>
                            )
                          }
                          {
                            this.state.discomDivisions.length > 2 && (
                              <Link title="Click to view all the billing units" class="hyperlink" style="font-size: x-large;" onClick={this.toggleMultipleBUModal.bind(this)}>
                                <strong>...</strong>
                              </Link>
                            )
                          }
                        </td>
                      </tr>
                      <tr>
                        <td>Connection Type</td>
                        <td>
                          <strong>{
                            (connectionTypes[billForm.connectionType] || 'Not Available')
                          }</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Budget Name</td>
                        <td>
                          <strong>{
                            (budgetDetails.displayName || 'Not Available')
                          }</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Financial Year</td>
                        <td>
                          <strong>{
                            (budgetDetails.financialYear || 'Not Available')
                          }</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Created By</td>
                        <td>
                          <strong>{
                            (this.state.billFormDetails.createdByName || 'Not available')
                          }</strong>
                        </td>
                      </tr>
                      {
                        ((this.state.organizationCreationMethod === 'wardwise' || this.state.organizationCreationMethod === 'zonewardwise')) && (
                          <tr>
                            <td>Wards</td>
                            <td>
                              <strong>{
                                this.state.billFormDetails.wards.length &&
                                  this.state.billFormDetails.wards.map((ward) =>
                                    <span>{ward.wardDisplayName}</span>) || 'Not Available'
                              }</strong>
                            </td>
                          </tr>
                        )
                      }
                      {
                        ((this.state.organizationCreationMethod === 'zonewise' || this.state.organizationCreationMethod === 'zonewardwise')) && (
                          <tr>
                            <td>Zones</td>
                            <td>
                              <strong>{
                                this.state.billFormDetails.zones.length &&
                                  this.state.billFormDetails.zones.map((zone) =>
                                    <span>{zone.zoneDisplayName}</span>) || 'Not Available'
                              }</strong>
                            </td>
                          </tr>
                        )
                      }
                      {
                        <tr>
                          <td>Departments</td>
                          <td>
                            <strong>{
                              this.state.billFormDetails.departments.length &&
                                this.state.billFormDetails.departments.map((department) =>
                                  <span>{department.departmentDisplayName}</span>) || 'Not Available'
                            }</strong>
                          </td>
                        </tr>
                      }

                      <tr>
                        <td>Status</td>
                        <td>
                          <strong>{this.state.billFormDetails.status && this.state.statuses[this.state.billFormDetails.status]}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Total Amount</td>
                        <td>
                          <strong>{getFormattedAmount(this.state.billFormDetails.amount)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">
              <label style="width:100%;">Current Task Status</label>
              <hr class="popup-hr" />
              <div class="column no-padding">
                <div class={`table-responsive`}>
                  <table class="m-b-10 no-border-table">
                    <tbody>
                      <tr>
                        <td style="width: 130px;">Owner</td>
                        <td>
                          <strong>{
                            this.state.taskDetails.ownerName || 'Not available'
                          }</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Requested By</td>
                        <td>
                          <strong>{
                            this.state.taskDetails.requestedByName || 'Not available'
                          }</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Requested To</td>
                        <td>
                          <strong>{
                            this.state.taskDetails.requestedToName || 'Not available'
                          }</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Current Status</td>
                        <td>
                          <strong>
                            {this.state.taskDetails.status && this.state.statuses[this.state.taskDetails.status]}
                          </strong>
                        </td>
                      </tr>

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
                    !this.state.historyDetails.length && this.state.loadingTaskHistoryList && (
                      <span class="button-margin-left">Loading...</span>
                    )
                  }
                  {
                    !this.state.historyDetails.length && !this.state.loadingTaskHistoryList && (
                      <span class="button-margin-left">No History Found</span>
                    )
                  }
                  {
                    this.state.historyDetails.length > 0 && !this.state.loadingTaskHistoryList && (
                      <table class="m-b-10 no-border-table">
                        <thead>
                          <tr>
                            <th>Responsible User</th>
                            <th>Action</th>
                            <th>Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            this.state.historyDetails.map((row) => (
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
                    )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {
          this.state.isSubmitForReviewModalOpen && (
            <Modal title="Submit For Review" modalSize="is-medium" onClose={this.toggleSubmitForReview.bind(this)}>
              <form name="Submit" onSubmit={this.submitForReview.bind(this)}>
                <ModalBody>
                  {
                    this.state.billForm.status === 'submittedforreview' &&
                      <div class="row">
                        <div class="column">
                          <strong>{this.state.billFormQuorum}</strong> approvals are mandatory to process payment of the {this.state.billFormDisplayName}.
                          {
                            taskDetails.acceptanceCount > 0 &&
                            <span>
                              {
                                taskDetails.acceptanceCount === 1 &&
                                <span>
                                  <strong>{taskDetails.acceptanceCount}</strong> reviewer has already approved the {this.state.billFormDisplayName}.
                                </span>
                              }
                              {
                                taskDetails.acceptanceCount !== 1 &&
                                <span>
                                  <strong>{taskDetails.acceptanceCount}</strong> reviewers have already approved the {this.state.billFormDisplayName}.
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
                      <select name='department' value={this.state.department}
                        onInput={linkState(this, 'department')} required onChange={this.loadUsers.bind(this)}>
                        <option value='' selected>Select Department</option>
                        {
                          this.state.departmentList.map((list, index) =>
                            ( <option value={list._id} key={index}>{list.displayName}</option>))
                        }
                      </select>
                    </div>
                    <div class="col-xs-12 col-sm-12 col-md-6 col-lg-6 select">
                      <select disabled={this.state.isEnableReviewerDropdown === false} name='reviewer' value={this.state.reviewer}
                        onInput={linkState(this, 'reviewer')} required>
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
                      <textarea type="text" value={this.state.comment} onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button type="submit" class="button-small">Submit</button>
                </ModalFooter>
              </form>
            </Modal>
          )
        }
        {
          this.state.showQuorumFullMessageModal &&
            <Modal title="Submit For Further Review" modalSize="is-medium" onClose={this.toggleSubmitForFurtherReview.bind(this)}>
              <form name="submitForFurtherReview" onSubmit={this.approveBillForm.bind(this)}>
                <ModalBody>
                  {
                    this.state.billFormQuorum !== 0 &&
                    <p>
                    Minimum review number for this {this.state.billFormDisplayName} is satisfied. If you want to send for another review,
                    click on 'Submit', else click on 'Approve' to approve this {this.state.billFormDisplayName}.
                    </p>
                  }
                  {
                    this.state.billFormQuorum === 0 &&
                    <p>
                      This action will approve the {this.state.billFormDisplayName}, however if you want to send it for review
                      click on 'Submit' button, else click on 'Approve' button.
                    </p>
                  }
                </ModalBody>
                <ModalFooter>
                  <button type="button" class="button-small" onClick={this.toggleSubmitForReview.bind(this)}>Submit</button>
                  {
                    this.state.billFormQuorum !== 0 &&
                    <button type="submit" class="button-small">Approve</button>
                  }
                  {
                    this.state.billFormQuorum === 0 &&
                    <button type="button" class="button-small" onClick={this.approveBillFormOfZeroQuorum.bind(this)}>Approve</button>
                  }
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.rejectModal &&
            <Modal title={this.state.rejectModalTitle} modalSize="is-medium" onClose={this.toggleRejectModal.bind(this)}>
              <form name="submitForFurtherReview" onSubmit={this.rejectBillForm.bind(this)}>
                <ModalBody>
                  <textarea type="text" value={this.state.comment} required
                    onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
                </ModalBody>
                <ModalFooter>
                  <button type="submit" class="button-small">Reject</button>
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.requestChangesModal &&
            <Modal title="Request Changes" modalSize="is-medium" onClose={this.toggleRequestChangesModal.bind(this)}>
              <form name="submitForFurtherReview" onSubmit={this.requestChanges.bind(this)}>
                <ModalBody>
                  <textarea value={this.state.comment} required
                    onInput={linkState(this, 'comment')} placeholder="Write a Comment" name="comment" />
                </ModalBody>
                <ModalFooter>
                  <button type="submit" class="button-small">Reject</button>
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.isMultipleBUModalOpen &&
            <Modal title="Billing Units" modalSize="is-medium" onClose={this.toggleMultipleBUModal.bind(this)}>
              <ModalBody>
                <div class="row">
                  <div class="column">
                    <table>
                      <thead>
                        <tr>
                          <th>Sr. No.</th>
                          <th>Number</th>
                          <th>Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          this.state.discomDivisions.map((discomDivision, index) =>
                            <tr>
                              <td>{index+1}</td>
                              <td>{discomDivision.number}</td>
                              <td style="text-transform:capitalize">{discomDivision.name.toLowerCase()}</td>
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <button class="button-small" onClick={this.toggleMultipleBUModal.bind(this)}>Close</button>
              </ModalFooter>
            </Modal>
        }

      </div>
    );
  }
}
