import { h, Component } from 'preact';
import { Link } from 'preact-router';
import CONSTANTS from '../../lib/constants';
// import ConnectedLoad from '../../components/connectedLoad';
import ConsumerHistory from '../../components/consumerHistory';
import ConsumerStatusHistory from '../../components/consumerStatusHistory';
// import ConsumerTrends from '../../components/consumerTrends';
import BillHistory from '../../components/billHistory_new';
// import Correspondance from '../../components/protestDetails';
import { Modal, ModalBody, ModalFooter } from '../../components/modal';
import { Toast } from '../../lib/toastr';
import http from 'fetch-bb';
import { formatDateTime, startLoader, stopLoader, getFormattedAmount } from '../../lib/utils';
import NavigationDropdown from '../../components/navigationDropdown';
import { AppStore } from '../../lib/store';
import linkState from 'linkstate';
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/*
  T1530 - APP - Text box is editable of Approve Bill pop-up, when pop-up is opened for the 1st time
  Developer: Arvind Shinde
  Date: 24/07/2018

  - Renamed getBillStastus() to getBillStatus() throughout the route.
*/
export default class ConsumerDetails extends Component {

  toggleReviewBillModal() {
    const bill = this.state.consumerBillDetails;
    this.setState({
      isReviewBillModal: !this.state.isReviewBillModal,
      protestFile:null ,
      comment: '',
      protestBill: bill.protestFlag || '',
      reviewBill: '',
      billType: bill.billType,
      currentProtestFlag: bill.protestFlag || '',
      billStatusSelected: false,
      regularBillPayableAmount: AppStore.get('userinfo').company.metadata.regularBillPayableAmount,
      sddBillPayableAmount: AppStore.get('userinfo').company.metadata.sddBillPayableAmount
    });
    /*
      T1530 - APP - Text box is editable of Approve Bill pop-up, when pop-up is opened for the 1st time
      Developer: Arvind Shinde
      Date: 24/07/2018
    */
    if ((this.state.billType === 'regular' && this.state.regularBillPayableAmount === 'other') ||
    (this.state.billType === 'securitydepositdemand' && this.state.sddBillPayableAmount === 'other')) {
      this.setState({isOtherSelected: true});
    } else {
      this.setState({isOtherSelected: false});
    }
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
    if (this.state.billType === "regular") {
      this.setState({payableAmount: this.state.amount[this.state.regularBillPayableAmount],
        selectedPaymentAmount: this.state.regularBillPayableAmount});
    } else {
      this.setState({payableAmount: this.state.amount[this.state.sddBillPayableAmount],
        selectedPaymentAmount: this.state.sddBillPayableAmount});
    }
  }

  toggleProtestBillModal() {
    const bill = this.state.consumerBillDetails;
    this.setState({
      isProtestBillModal: !this.state.isProtestBillModal,
      protestFile:null ,
      comment: '',
      protestBill: bill.protestFlag || '',
      currentProtestFlag: bill.protestFlag || '',
      billStatusSelected: false
    });

  }

  getAmountToBePaid(e) {
    this.setState({ selectedPaymentAmount: e.target.value });

    if (this.state.billType === "regular") {
      this.setState({regularBillPayableAmount: e.target.value});
    }
    else {
      this.setState({sddBillPayableAmount: e.target.value});
    }

    if (this.state.selectedPaymentAmount !== "other") {
      let selectedAmount = this.state.amount[e.target.value];
      this.setState({isOtherSelected: false, payableAmount: selectedAmount });
    }
    else {
      this.setState({isOtherSelected: true, payableAmount: '' });
    }
  }

  reviewBillSubmit(e) {
    e.preventDefault();
    this.changeBillStatusToPayBill(e);
  }

  protestBillSubmit(e) {
    e.preventDefault();
    this.changeProtestStatus(e);
  }

  getBillToBeProtest(e) {
    this.setState({
      protestBill: e.target.value,
      protestFile: e.target.value ? this.state.protestFile : null,
      billStatusSelected: true,
      comment: e.target.value ? this.state.comment : ''
    });
  }

  changeBillStatusToPayBill(e) {
    if (this.state.totalRoundedBill <= 0 && this.state.reviewBill === 'paybill') {
      return new Toast('Negative or zero bills cannot be marked as Pay Bill.', Toast.TYPE_ERROR, Toast.TIME_LONG);
    }
    this.callApiForChangeBillStatus(e);
  }

  // changeBillStatusToPayBill(e) {
  //   if (!this.state.protestFile) {
  //     return this.callApiForChangeBillStatus(e);
  //   }
  //   const fileObj = {
  //     name:e.target.protestFile.files[0].name,
  //     size:e.target.protestFile.files[0].size,
  //     type:e.target.protestFile.files[0].type,
  //     value:e.target.protestFile.value
  //   };
  //   let formFile = e.target.protestFile.files[0];
  //   return http.post(`${CONSTANTS.API_URL}/api/file/getSignedUrl`,
  //     {
  //       file: fileObj
  //     })
  //     .then((fileDetails) => {
  //       const opts = {
  //         headers: [{
  //           name: 'Content-Type',
  //           value: 'multipart/form-data'
  //         }]
  //       };
  //       // To Upload the image file .jpg and .jpeg formdata does not support.
  //       // let formdata = new FormData();
  //       // formdata.append('file', formFile);
  //       return http.put(fileDetails.signedURL, formFile, opts)
  //         .then(() => {
  //           return this.callApiForChangeBillStatus(e, fileDetails)
  //             .then(() => {
  //               new Toast('File uploaded successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
  //             });
  //         });
  //     })
  //     .catch((HTTPException) => {
  //       console.error(HTTPException);
  //       new Toast('Error while uploading file', Toast.TYPE_ERROR, Toast.TIME_LONG);
  //     });
  // }

  changeProtestStatus(e) {
    if (!this.state.protestFile) {
      return this.callApiForChangeProtestStatus(e);
    }
    const fileObj = {
      name:e.target.protestFile.files[0].name,
      size:e.target.protestFile.files[0].size,
      type:e.target.protestFile.files[0].type,
      value:e.target.protestFile.value
    };
    let formFile = e.target.protestFile.files[0];
    return http.post(`${CONSTANTS.API_URL}/api/file/getSignedUrl`,
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
        // To Upload the image file .jpg and .jpeg formdata does not support.
        // let formdata = new FormData();
        // formdata.append('file', formFile);
        return http.put(fileDetails.signedURL, formFile, opts)
          .then(() => {
            return this.callApiForChangeProtestStatus(e, fileDetails)
              .then(() => {
                new Toast('File uploaded successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
              });
          });
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        new Toast('Error while uploading file', Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }


  callApiForChangeBillStatus(e) {
    if (this.state.consumerBillDetails.totalRoundedBill <= 0 && e.target.reviewBill.value === 'paybill') {
      return new Toast('Negative or zero bills cannot be marked as Pay Bill.', Toast.TYPE_ERROR, Toast.TIME_LONG);
    }
    const toastMessage = {
      paybill: {
        success: 'Successfully updated status to Pay Bill',
        error: 'Could not update status of bill to Pay Bill'
      },
      unpaid: {
        success: 'Successfully updated status to Do Not Pay',
        error: 'Could not update status of bill to Do Not Pay'
      }
    };

    let body= {};
    if (this.state.reviewBill) {
      body.status =  this.state.reviewBill;
    }

    // body.protestFlag=  this.state.protestBill;
    if (this.state.selectedPaymentAmount){
      body.selectedPaymentAmount = this.state.selectedPaymentAmount;
    }
    if (this.state.selectedPaymentAmount === "other" && e.target.payableAmount){
      body.payableAmount = Number(e.target.payableAmount.value);
    } else {
      body.payableAmount = this.state.payableAmount;
    }
    // if (this.state.comment){
    //   body.comment= this.state.comment;
    // }
    // if (file){
    //   body.fileID= file._id;
    // }

    if (Object.keys(body).length > 0 ) {
      return http
        .put(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}`,body )
        .then(() => {
          if (body.status) {
            new Toast(toastMessage[e.target.reviewBill.value].success, Toast.TYPE_DONE, Toast.TIME_LONG);
          } else {
            new Toast('Bill updated successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
          }
          this.toggleReviewBillModal();
          this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
        })
        .catch((HTTPException) => {
          console.error(HTTPException);
          if (body.status) {
            new Toast(toastMessage[e.target.reviewBill.value].error, Toast.TYPE_ERROR, Toast.TIME_LONG);
          } else {
            new Toast('Error while updating bill', Toast.TYPE_ERROR, Toast.TIME_LONG);
          }
        });
    }
  }

  callApiForChangeProtestStatus(e, file) {
    let body= {};
    body.protestFlag = this.state.protestBill;

    if (this.state.comment) {
      body.comment = this.state.comment;
    }
    if (file){
      body.fileID = file._id;
    }
    if (Object.keys(body).length > 0 ) {
      return http
        .put(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}`,body )
        .then(() => {
          new Toast('Protested status updated successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
          this.toggleProtestBillModal();
          this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
        })
        .catch((HTTPException) => {
          console.error(HTTPException);
          new Toast('Error while updating bill', Toast.TYPE_ERROR, Toast.TIME_LONG);
        });
    }
  }

  check(e) {
    if (e.target.checked) {
      this.setState({protestBill: 'tobeprotested'});
    } else {
      this.setState({protestBill: '',protestFile: null});
    }
  }

  getFileAndCheckFileSize(e) {
    this.setState({protestFile: e.target.value});
    if (e.target.files[0].size > 5242880) {
      new Toast('File size should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
      return e.target.value = null;
    }
  }

  isFileSizeValid(e) {
    if (e.target.files && e.target.files[0] && e.target.files[0].size > 5242880) {
      new Toast('File size should be less than 5 MB', Toast.TYPE_ERROR, Toast.TIME_LONG);
      return e.target.value = null;
    }
  }

  getBillStatus(e) {
    this.setState({
      reviewBill: e.target.value,
      billStatusSelected:true
    });
  }

  getConsumerDetails() {
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.matches.consumerID}`)
      .then((consumerDetails) => {
        if (consumerDetails) {
          let wardName = new Promise((resolve) =>{
            if (consumerDetails.wardID) {
              http.get(`${CONSTANTS.API_URL}/api/company/ward`, {
                id: [consumerDetails.wardID]
              }).then((ward) => {
                consumerDetails.wardName = ward.length && ward[0].displayName;
                return resolve();
              });
            }
            else {
              return resolve();
            }
          });

          let discomName = new Promise((resolve) => {
            if (consumerDetails.discomID) {
              http.get(`${CONSTANTS.API_URL}/api/discom`, {
                id: [consumerDetails.discomID]
              }).then((discom) => {
                consumerDetails.discomName = discom.length && discom[0].name;
                return resolve();
              });
            }
            else {
              return resolve();
            }
          });

          let departmentName = new Promise((resolve) => {
            if (consumerDetails.departmentID) {
              http.get(`${CONSTANTS.API_URL}/api/company/department`, {
                id: [consumerDetails.departmentID]
              }).then((department) => {
                consumerDetails.departmentName = department.length && department[0].displayName;
                return resolve();
              });
            }
            else {
              return resolve();
            }
          });

          let budgetCategoryName = new Promise((resolve) => {
            if (consumerDetails.budgetCategoryID) {
              http.get(`${CONSTANTS.API_URL}/api/budgetCategory`, {
                id: [consumerDetails.budgetCategoryID]
              }).then((budgetCategory) => {
                consumerDetails.budgetCategoryName = budgetCategory.length && ( budgetCategory[0].code ? budgetCategory[0].code + ' - '
                 + budgetCategory[0].displayName : budgetCategory[0].displayName );
                return resolve();
              });
            }
            else {
              return resolve();
            }
          });

          let zoneName = new Promise((resolve) =>{
            if (consumerDetails.zoneID) {
              http.get(`${CONSTANTS.API_URL}/api/company/zone`, {
                id: [consumerDetails.zoneID]
              }).then((zone) => {
                consumerDetails.zoneName = zone.length && zone[0].displayName;
                return resolve();
              });
            }
            else {
              return resolve();
            }
          });
          return Promise.all([wardName,discomName,departmentName,budgetCategoryName,zoneName])
            .then(() => {
              this.setState({consumerDetails});
              this.setBillMonthAndYear();
            })
            .catch((HTTPException) => {
              console.error(HTTPException);
            });
        }
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        stopLoader();
      });
  }

  setBillMonthAndYear() {
    // const today = new Date();
    if (this.props.matches.month && this.props.matches.year) {
      this.state.selectedBillYear = this.props.matches.year;
      this.state.selectedBillMonth = this.props.matches.month;
    } else {
      this.state.selectedBillYear = this.state.consumerDetails.latestDiscomBillYear; // || today.getFullYear();
      this.state.selectedBillMonth = this.state.consumerDetails.latestDiscomBillMonth; // || (today.getMonth() + 1);
    }
    if (this.state.selectedBillYear && this.state.selectedBillMonth) {
      this.getConsumerBill({ year: this.state.selectedBillYear, month: this.state.selectedBillMonth });
    } else {
      new Toast('Bill is not available', Toast.TYPE_DONE, Toast.TIME_LONG);
      stopLoader();
    }
  }

  setBillYearsArray() {
    let currentYear = new Date().getFullYear();
    let lowerLimit = 2015;
    for (currentYear; currentYear >= lowerLimit; currentYear--) {
      this.state.billYears.push(currentYear);
    }
  }

  calculatePromptCountDown() {
    let currentDate = new Intl.DateTimeFormat('en-IN').format(new Date());
    currentDate = new Date(currentDate.split('/')[2],currentDate.split('/')[1]-1,currentDate.split('/')[0]);

    let promptPaymentDate = formatDateTime(this.state.consumerBillDetails.promptPaymentDate);
    promptPaymentDate = new Date(promptPaymentDate.split('/')[2],promptPaymentDate.split('/')[1]-1,promptPaymentDate.split('/')[0]);

    let timeDiff = Math.abs(currentDate.getTime() - promptPaymentDate.getTime());
    let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (currentDate < promptPaymentDate) {
      this.state.consumerBillDetails.daysBeforePromptPayment = diffDays + ' days left';
      this.setState({consumerBillDetails: this.state.consumerBillDetails});
    } else if (currentDate.toString() === promptPaymentDate.toString()){
      this.state.consumerBillDetails.daysBeforePromptPayment = 'Today';
      this.setState({consumerBillDetails: this.state.consumerBillDetails});
    } else {
      this.state.consumerBillDetails.daysBeforePromptPayment = 'Over';
      this.setState({consumerBillDetails: this.state.consumerBillDetails});
    }
  }

  onBillMonthChange(e) {
    e.preventDefault();
    startLoader();
    this.setState({selectedBillMonth: e.target.value, consumerBillDetails: {}});
    this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
  }

  onBillYearChange(e) {
    e.preventDefault();
    startLoader();
    this.setState({selectedBillYear: e.target.value, consumerBillDetails: {}});
    this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
  }

  printWindow() {
    startLoader();
    const params = {};

    if (this.props.matches.subComponent === 'securitydepositdemand') {
      params.billType = this.props.matches.subComponent;
    }
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.matches.consumerID}/bill/${this.state.selectedBillYear}/${this.state.selectedBillMonth}`,
      params)
      .then((response) => {
        // if (response.billType === 'securitydepositdemand' && response.image_url) {
        //   let sddBillUrl = "data:"+ response.image_url.ContentType +";base64," + this.encode(response.image_url.Body.data);
        //   this.setState({sddBillUrl});
        // }
        if (response.html_bill) {
          let responseHtmlBill=response.html_bill;
          this.state.consumerBillDetails['html_bill'] = responseHtmlBill;
        }
        this.setState({consumerBillDetails: this.state.consumerBillDetails});
        setTimeout(() => {
          this.printAll();
          stopLoader();
        }, 0);
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

    /*
      T1533 Print Bill issue from consumer detail view.
      Developer: Manohar
      Comment: w.onload event trigger after document load on window.
        this issue is not reproduce on locally
      Date: 24/07/18
    */
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

  printReceipt(){
    let printContents = document.getElementById('receipt').innerHTML;
    let w = window.open();

    w.document.write(printContents);
    w.document.close();
    w.focus();
    w.onload = function() {
      w.print();
      w.close();
    };
    return true;
  }
  resizeIframe(e) {
    let frame = document.getElementById("myFrame");
    let  printButtonOnBill=Array.from(frame.contentDocument.body.getElementsByClassName("printButtonContainer"));
    printButtonOnBill.map((element) => {
      element.style.display="none";
    });
    e.target.style.height = 0;
    e.target.style.height = e.target.contentWindow.document.body.scrollHeight + 'px';
  // e.target.style.transform = 'scale (0.91)';
  }

  submit(e) {
    e.preventDefault();
  }

  getConsumerBill(filters) {
    const params = {};

    if (this.props.matches.subComponent === 'securitydepositdemand') {
      params.billType = this.props.matches.subComponent;
    }
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.matches.consumerID}/bill/${filters.year}/${filters.month}`, params)
      .then((response) => {
        // if (response.billType === 'securitydepositdemand' && response.image_url) {
        //   let sddBillUrl = "data:"+ response.image_url.ContentType +";base64," + this.encode(response.image_url.Body.data);
        //   this.setState({sddBillUrl});
        // }

        if (response.billFormID) {
          this.getBillFormNameFromID(response.billFormID);
        }

        this.setState({
          isBillPresent: true,
          consumerBillDetails: response,
          correctedBillUrl: '',
          sddBillUrl: ''
        });
        // this.getReconciliationDetails();
        this.calculatePromptCountDown();
        this.setState({selectedBillMonth: filters.month, selectedBillYear: filters.year});
        if (response.isCorrectedBillUploaded) {
          this.getCorrectedBillUrl();
        }
        if (response.isSecurityDepositBillUploaded) {
          this.getSddBillUrl();
        }
        // this.setState({
        //   correctedBillUrl: '',
        //   sddBillUrl: ''
        // });
        stopLoader();

        // let url = '/cosnumers/' + this.props.matches.consumerID + '?year=' + this.state.selectedBillYear + '&month=' + this.state.selectedBillMonth;
        // this.props.url = url;
        // route(this.props.url);

      }).catch((HTTPException) => {
        console.error(HTTPException);
        this.setState({isBillPresent:false});
        stopLoader();
      });
  }

  getBillFormNameFromID(billFormID) {
    return http.get(`${CONSTANTS.API_URL}/api/billform/${billFormID}`)
      .then((billForm) => {
        this.setState({customerBillFormNumber: billForm.customerBillFormNumber});
      }).catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  getCorrectedBillUrl() {
    return http.get(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/getCorrectedBillSignedUrl`, {typeOfBill: 'correctedBills'})
      .then((fileDetails) => {
        this.setState({
          correctedBillUrl: fileDetails.signedURL
          // correctedBillUrl: 'https://billwise-app.s3.ap-south-1.amazonaws.com/correctedBills/pmc/msedcl/979910000299/2018/4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAILMC3NOAKXMSJG5A%2F20180516%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20180516T115754Z&X-Amz-Expires=600&X-Amz-Signature=6bc66c078009a3d90c3d7457800e2c15db6de2a09cf91f38a03dbe02f8ebade5&X-Amz-SignedHeaders=
          //host&response-content-disposition=attachment'
        });
      }).catch((HTTPException) => {
        console.error(HTTPException);
        this.setState({isBillPresent:false, correctedBillUrl: ''});
        stopLoader();
      });
  }

  getSddBillUrl() {
    return http.get(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/getCorrectedBillSignedUrl`, {typeOfBill: 'sdBills'})
      .then((fileDetails) => {
        this.setState({
          sddBillUrl: fileDetails.signedURL
          // correctedBillUrl: 'https://billwise-app.s3.ap-south-1.amazonaws.com/correctedBills/pmc/msedcl/979910000299/2018/4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAILMC3NOAKXMSJG5A%2F20180516%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20180516T115754Z&X-Amz-Expires=600&X-Amz-Signature=6bc66c078009a3d90c3d7457800e2c15db6de2a09cf91f38a03dbe02f8ebade5&X-Amz-SignedHeaders=
          //host&response-content-disposition=attachment'
        });
      }).catch((HTTPException) => {
        console.error(HTTPException);
        this.setState({isBillPresent:false ,sddBillUrl: ''});
        stopLoader();
      });
  }

  // encode(data)
  // {
  //   let output = [];
  //   let str = "";
  //   for (let i = 0; i < data.length; i++)
  //   {
  //     str += String.fromCharCode(data[i]);
  //     if (str.length === 57)
  //     {
  //       output[output.length] = window.btoa(str);
  //       str = "";
  //     }
  //   }
  //   if (str !== "")
  //     output[output.length] = window.btoa(str);
  //   return output.join("\n");
  // }

  navigateToSubComponent(viewName) {
    this.setState({
      displayViewName: viewName
    });
  }

  viewBillHistory() {
    this.setState({
      displayViewName: 'singleBillHistory'
    });
  }

  toggleUploadCorrectedBillModal() {
    this.setState({
      isUploadCorrectedBillModalOpen : !this.state.isUploadCorrectedBillModalOpen,
      correctedBill:''
    });
  }

  toggleUploadSDDBillModal() {
    this.setState({
      isUploadSDDBillModalOpen : !this.state.isUploadSDDBillModalOpen,
      sddBill:''
    });
  }

  onCorrectedBillUpload(e) {
    e.preventDefault();
    if (this.state.consumerBillDetails.isCorrectedBillUploaded) {
      new Toast('The corrected bill is already uploaded.', Toast.TYPE_ERROR, Toast.TIME_LONG);
      this.setState({
        isUploadCorrectedBillModalOpen : !this.state.isUploadCorrectedBillModalOpen
      });
      e.reset();
      return;
    }
    let correctedBill = e.target.correctedBill.files[0];
    return http.post(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/createUploadedBillSignedUrl`,
      {
        type: correctedBill.type,
        typeOfBill: 'correctedBills'
      })
      .then((fileDetails) => {
        const opts = {
          headers: [{
            name: 'Content-Type',
            value: 'multipart/form-data'
          }]
        };
        return http.put(fileDetails.signedURL, correctedBill, opts)
          .then(() => {
            return http.put(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/updateBillUploaded`,{typeOfBill: 'correctedBills'})
              .then(() => {
                this.setState({
                  isUploadCorrectedBillModalOpen : !this.state.isUploadCorrectedBillModalOpen
                });
                new Toast('Corrected Bill uploaded successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
                this.getConsumerBill({ year: this.state.selectedBillYear, month: this.state.selectedBillMonth });
              });
          });
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  onSDDBillUpload(e) {
    e.preventDefault();
    if (this.state.consumerBillDetails.isSecurityDepositBillUploaded) {
      new Toast('The Security Deposit bill is already uploaded.', Toast.TYPE_ERROR, Toast.TIME_LONG);
      this.setState({
        isUploadSDDBillModalOpen : !this.state.isUploadSDDBillModalOpen
      });
      e.reset();
      return;
    }
    let sddBill = e.target.sddBill.files[0];
    return http.post(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/createUploadedBillSignedUrl`,
      {
        type: sddBill.type,
        typeOfBill: 'sdBills'
      })
      .then((fileDetails) => {
        const opts = {
          headers: [{
            name: 'Content-Type',
            value: 'multipart/form-data'
          }]
        };
        return http.put(fileDetails.signedURL, sddBill, opts)
          .then(() => {
            return http.put(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/updateBillUploaded`, {typeOfBill: 'sdBills'})
              .then(() => {
                this.setState({
                  isUploadSDDBillModalOpen : !this.state.isUploadSDDBillModalOpen
                });
                new Toast('Security Deposit Bill uploaded successfully', Toast.TYPE_DONE, Toast.TIME_LONG);
                this.getConsumerBill({ year: this.state.selectedBillYear, month: this.state.selectedBillMonth });
              });
          });
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  componentWillMount() {
    this.state = {
      displayViewName:'billdetails',
      consumerDetails: {},
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
        12: 'Dec'},
      billYears: [],
      selectedBillMonth: '',
      selectedBillYear: '',
      consumerBillDetails: {},
      isReviewBillModal: true,
      isProtestBillModal: true,
      statuses: {
        validationpending: 'Validation Pending',
        queued: 'Queued',
        companyverificationpending: 'Non Verified',
        invalid: 'Invalid',
        verified: 'Verified',
        rejected: 'Rejected'
      },
      billStatuses: {
        reviewpending: 'Review Pending',
        paybill: 'Approved',
        unpaid: 'Unpaid',
        paid: 'Paid',
        // Added unreviewed key to display Unreviewed tag on Consumer Details
        // Developer - Shrutika Khot
        // Date - 21/07/18
        // Added paidoutsidebillwise key to display Unreviewed tag on Consumer Details
        // on 23/08/18
        // Added underProcessBBPS key to display 'Payment Under Process' tag on Consumer Details
        // on 04/10/18
        unreviewed: 'Unreviewed',
        paidoutsidebillwise: 'Paid Outside Powerdek',
        billwisedisabled: 'Powerdek Disabled',
        initiated: 'Payment Initiated',
        failed: 'Failed',
        underProcessBBPS: 'Payment Under Process'
      },
      isRadioSelected: false,
      isConsumerInfoModalOpen: false,
      isBillwiseFindingsModalOpen: false,
      billwiseFindingsList: [],
      billwiseFindingsFlagClasses: {
        'no issues': {
          name: ' No Issues',
          iconClass: 'icon icon-checkmark-circled billwise-finding-no-isssue'
        },
        'few issues': {
          name: ' Few Issues',
          iconClass: 'icon icon-close-circled billwise-finding-issue'
        },
        'Passed': {
          name: ' Passed',
          iconClass: 'icon icon-checkmark-circled billwise-finding-no-isssue'
        },
        'Failed': {
          name: ' Failed',
          iconClass: 'icon icon-close-circled billwise-finding-issue'
        },
        'Not Checked': {
          name: ' Not Checked',
          iconClass: 'icon icon-alert-circled'
        }
      },
      protestFile:null,
      comment: '',
      protestBill: '',
      reviewBill: '',
      connectionStatuses: {
        'live': {
          statusName: 'Live',
          statusClass: 'tag is-success'
        },
        'pd': {
          statusName: 'Permanently Disconnected',
          statusClass: 'tag is-danger'
        },
        'p.d.': {
          statusName: 'Permanently Disconnected',
          statusClass: 'tag is-danger'
        },
        't.d.': {
          statusName: 'Live',
          statusClass: 'tag is-success'
        },
        /*
          T1360: T.D. connection status is displayed on consumer detail view of silo admin
          Developer - Arvind Shinde
          Date: 26 June 2018
        */
        'td': {
          statusName: 'Live',
          statusClass: 'tag is-success'
        } // comment end
      },
      loadingBillwiseFindingsList: false,
      isUploadCorrectedBillModalOpen: false,
      correctedBillUrl: '',
      correctedBill: '',
      reconciliationModal: false,
      reportData: [],
      isBillPresent: false,
      billStatusSelected: false,
      isUploadSDDBillModalOpen:false,
      sddBill: '',
      amount: {},
      billType: '',
      payableAmount: '',
      selectedPaymentAmount: '',
      isReplaceSummaryModal: false,
      successResponse: {
        updatedBudgets: [],
        updatedBills: [],
        billForm: {},
        previousAllocatedBudget: {}
      },
      regularBillPayableAmount: AppStore.get('userinfo').company.metadata.regularBillPayableAmount,
      sddBillPayableAmount: AppStore.get('userinfo').company.metadata.sddBillPayableAmount,
      isReceiptModalOpen: false,
      customerBillFormNumber: '',
      /*
        Declared isReplaceBillModal, isBillFormFound, replaceBill for
        T1520 - Bill form Summary pop-up is not displayed if the bill is replaced form the consumer detail view
        Developer - Shrutika Khot
        date - 21/07/18
      */
      isReplaceBillModal: false,
      isBillFormFound: true,
      replaceBill: {},
      /*
      T1498: Display Name for bill form
      Developer: Samruddhi
      Date: 17/7/2018
      */
      billFormDisplayName: AppStore.get('userinfo').company.billFormDisplayName
    };
  }
  componentDidMount() {
    const userInfo = AppStore.get('userinfo');
    this.setState({isClientAdmin: userInfo.isClientAdmin, organizationCreationMethod: userInfo.company.metadata.organizationCreationMethod});
    this.setBillYearsArray();
    this.getConsumerDetails();
  }

  toggle() {
    this.setState({isOpen: !this.state.isOpen});
  }

  toggleConsumerInfoModal() {
    this.setState({isConsumerInfoModalOpen: !this.state.isConsumerInfoModalOpen});
  }

  isProcessBillButtonVisible() {
    //T1030 process bill button was not displaying on hold bill detail view

    return (
      this.state.consumerBillDetails.consumerStatus === 'verified' &&
      (this.state.consumerBillDetails.status === 'reviewpending' && this.state.consumerBillDetails.status !== 'paidoutsidebillwise')
      && !this.state.isClientAdmin
    );
    //Below condition was modified in above, to achieve the requirement

    // return (this.state.consumerBillDetails.consumerStatus === 'verified' && (this.state.consumerBillDetails.status === 'reviewpending' ||
    //  this.state.consumerBillDetails.status === 'unpaid' || this.state.consumerBillDetails.status !== 'paidoutsidebillwise'
    // || (this.state.consumerBillDetails.status === 'paybill' && !this.state.consumerBillDetails.billFormID)) && !this.state.isClientAdmin);

    // const consumerStatus = this.state.consumerDetails.status === 'verified';
    // const billStatus = this.state.consumerBillDetails.status === ('reviewpending' || 'unpaid' || 'paidoutsidebillwise');
    // const isBillFormCreated = (this.state.consumerBillDetails.status === 'paybill' && !this.state.consumerBillDetails.billFormID);
    // console.log(consumerStatus && (billStatus || isBillFormCreated) && !this.state.isClientAdmin);
    // return consumerStatus && (billStatus || isBillFormCreated) && !this.state.isClientAdmin;
  }

  toggleBillwiseFindingsModal() {
    this.setState({isBillwiseFindingsModalOpen: !this.state.isBillwiseFindingsModalOpen});
  }

  onBillwiseFindingsClick() {
    this.getBillwiseFindingsList();
    this.toggleBillwiseFindingsModal();
  }

  getBillwiseFindingsList() {
    this.setState({loadingBillwiseFindingsList: true});
    return http.get(`${CONSTANTS.API_URL}/api/company/${this.state.consumerBillDetails.companyID}/bill/${this.state.consumerBillDetails._id}/analysis`)
      .then((response) => {
        this.setState({billwiseFindingsList: response, loadingBillwiseFindingsList: false});
      })
      .catch((HTTPException) => {
        this.setState({loadingBillwiseFindingsList: false});
        console.error(HTTPException);
      });
  }

  getReconciliationDetails() {
    let filters = {
      year: this.state.consumerBillDetails.year,
      month: this.state.consumerBillDetails.month,
      billID: this.state.consumerBillDetails._id
    };
    startLoader();
    return http.get(`${CONSTANTS.API_URL}/api/reconciliation`, filters)
      .then((response) => {
        response.map((bill) => {
          bill.reconciliationStatus = 'reconciled';
          bill.confirmation = '';
          bill.differenceOfDemandAndPaidAmount = 0;
          bill.differenceOfPaidAmountAndReceiptAmount = 0;
        });
        this.setState({reportData: response});
        stopLoader();
      })
      .catch((HTTPException) => {
        stopLoader();
        console.error(HTTPException.message);
      });
  }

  changeConfirmation(bill, value) {
    bill.confirmation = value;
    this.setState({reportData: this.state.reportData});
  }

  setPaymentParamReason(bill, e) {
    bill.paymentParamReason = e.target.value;
    this.setState({reportData: this.state.reportData});
  }

  setReceiptParamReason(bill, e) {
    bill.receiptParamReason = e.target.value;
    this.setState({reportData: this.state.reportData});
  }

  reconcileAndCreateReport(e) {
    e.preventDefault();
    let confirmation = confirm('Are you sure you want to complete the reconciliation for this bill?');
    if (!confirmation) return;
    let reportData = this.state.reportData.slice(); //To avoid array referencing
    if (reportData[0]._id) {
      reportData[0].billID = reportData[0]._id;
      delete reportData[0]._id;
    }
    if (reportData[0].computedDiscomBillPaidDate) {
      reportData[0].receiptDate = reportData[0].computedDiscomBillPaidDate;
      delete reportData[0].computedDiscomBillPaidDate;
    }
    if (reportData[0].computedDiscomBillPaidAmount || reportData[0].computedDiscomBillPaidAmount === 0) {
      reportData[0].receiptAmount = reportData[0].computedDiscomBillPaidAmount;
      delete reportData[0].computedDiscomBillPaidAmount;
    }
    if (reportData[0].totalRoundedBill || reportData[0].totalRoundedBill === 0) {
      reportData[0].demand = reportData[0].totalRoundedBill;
      delete reportData[0].totalRoundedBill;
    }
    if (reportData[0].payableAmount || reportData[0].payableAmount === 0) {
      reportData[0].amountTobePaid = reportData[0].payableAmount;
      delete reportData[0].payableAmount;
    }
    if (reportData[0].paymentModeReferenceNumber) {
      reportData[0].instrumentNumber = reportData[0].paymentModeReferenceNumber;
      delete reportData[0].paymentModeReferenceNumber;
    }
    if (reportData[0].paymentInstrumentDate) {
      reportData[0].instrumentDate = reportData[0].paymentInstrumentDate;
      delete reportData[0].paymentInstrumentDate;
    }

    delete reportData[0].percentDifferenceOfConsumedUnits;
    delete reportData[0].computedDiscomBillPaidDate;
    delete reportData[0].isEmpty;
    delete reportData[0].consumerStatus;

    return http.post(`${CONSTANTS.API_URL}/api/reconciliation/single/${this.state.reportData[0].billID}`, reportData[0])
      .then(() => {
        new Toast('Bill Reconciled Successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
        this.toggleReconciliationModal();
      })
      .catch((HTTPException) => {
        console.error(HTTPException.message);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  toggleReconciliationModal() {
    this.setState({reconciliationModal: !this.state.reconciliationModal});
  }

  openReconciliationModal() {
    this.setState({reconciliationModal: !this.state.reconciliationModal, reportData: []});
    this.getReconciliationDetails();
  }

  /*
    T1520 - Mark as paid outside billwise issues.
    Develoer - Shrutika Khot
    Date - 23/08/18
    Functions - markAsPaidOutsideBillwise(), revertStatusToReviewPending()
    Comment - Added toaster success messages
  */

  markAsPaidOutsideBillwise(billID) {
    let confirmMsg = confirm('The status of this bill will be changed to Paid and ' +
    'you will not be able to process this bill further. Are you sure you want to mark this bill as paid outside Powerdek system?');
    if (!confirmMsg) {
      return;
    }
    return http.put(`${CONSTANTS.API_URL}/api/bill/${billID}`, {status: 'paidoutsidebillwise'})
      .then(() => {
        new Toast('Bill Marked As Paid Successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  revertStatusToReviewPending(billID) {
    let confirmMsg = confirm('Are you sure you want to mark this bill as Review Pending again?');
    if (!confirmMsg) {
      return;
    }
    return http.put(`${CONSTANTS.API_URL}/api/bill/${billID}`, {status: 'reviewpending'})
      .then(() => {
        new Toast('Bill Marked As Review Pending Successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
      })
      .catch((HTTPException) => {
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(HTTPException.message);
      });
  }

  /*
    T1520 - Bill form Summary pop-up is not displayed if the bill is replaced form the consumer detail view
    Deveoer - Shrutika Khot
    Date - 21/07/18
    Functions - beforeReplacingBill(), replaceBill(), toggleReplaceBillModal()
  */

  beforeReplacingBill(e) {
    e.preventDefault();
    let confirmMsg = confirm('Are you sure you want to replace this bill in '+this.state.billFormDisplayName+' with latest bill?');
    if (!confirmMsg) return;
    startLoader();
    return http.put(`${CONSTANTS.API_URL}/api/bill/${this.state.consumerBillDetails._id}/replace`)
      .then((response) => {
        new Toast('Bill replaced with latest bill successfully.', Toast.TYPE_DONE, Toast.TIME_LONG);
        response.updatedBills.map((bill) => {
          if (bill.billFormID) {
            //If billformID present, bill is latest
            bill.summaryMessage = `Bill for ${months[bill.month - 1] + ' ' +bill.year}
              added in Bill Form with amount ${getFormattedAmount(bill.payableAmount)}`;
          }
          if (!bill.billFormID) {
            //If billformID is not present, bill is last month bill
            bill.summaryMessage = `Bill for ${months[bill.month - 1] + ' ' +bill.year}
              removed from Bill Form with amount ${getFormattedAmount(bill.payableAmount)}`;
          }
        });
        response.amountBeforeRemoving = response.previousAllocatedBudget.consumedAmount;
        this.setState({ isReplaceSummaryModal: true, isReplaceBillModal: !this.state.isReplaceBillModal, successResponse: response, isBillFormFound: true });
        stopLoader();
      })
      .catch((HTTPException) => {
        stopLoader();
        this.setState({isBillFormFound: false, isReplaceBillModal: !this.state.isReplaceBillModal});
        console.error(HTTPException.message);
        new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  replaceBill() {
    startLoader();
    let param = {
      month: (this.state.consumerBillDetails.month) - 1,
      year: this.state.consumerBillDetails.year
    };
    if (this.state.consumerBillDetails.month === 1) {
      param.month = 12;
      param.year = (this.state.consumerBillDetails.year) - 1;
    }
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.state.consumerBillDetails.consumerID}/bill/${param.year}/${param.month}?`)
      .then((response) => {
        this.setState({replaceBill: {budgetCategory: response.budgetCategoryDisplayName}});
        return http.get(`${CONSTANTS.API_URL}/api/billform/${response.billFormID}`)
          .then((response) => {
            this.setState({
              replaceBill: {
                billFormNumber: response.customerBillFormNumber,
                budgetCategory: this.state.consumerBillDetails.budgetCategoryCode ? (this.state.consumerBillDetails.budgetCategoryCode + ' - ' +
                  this.state.consumerBillDetails.budgetCategoryDisplayName) : this.state.consumerBillDetails.budgetCategoryDisplayName,
                totalAmount: response.amount,
                thisBillAmount: this.state.consumerBillDetails.payableAmount || 'Not Available'
              },
              isBillFormFound: true
            });
            stopLoader();
            this.setState({isReplaceBillModal: true});
          });
      })
      .catch(() => {
        stopLoader();
        this.setState({isReplaceBillModal: true, isBillFormFound: false});
      });
  }

  toggleReplaceBillModal() {
    this.setState({ isReplaceBillModal: !this.state.isReplaceBillModal });
  }

  onSummaryOkClick() {
    this.setState({isReplaceSummaryModal: false, successResponse: {
      updatedBudgets: [],
      updatedBills: [],
      billForm: {},
      previousAllocatedBudget: {}
    }});
    this.getConsumerBill({year: this.state.selectedBillYear, month: this.state.selectedBillMonth});
  }

  toggleReceiptModal() {
    this.setState({isReceiptModalOpen: !this.state.isReceiptModalOpen});
  }

  render({}, {displayViewName, billMonths, consumerBillDetails, consumerDetails, isReviewBillModal, billType, amount, isProtestBillModal,
    isConsumerInfoModalOpen, isBillwiseFindingsModalOpen, billwiseFindingsList, billwiseFindingsFlagClasses, successResponse,
    connectionStatuses, isUploadCorrectedBillModalOpen, correctedBillUrl, sddBillUrl, reportData, billStatuses,
    customerBillFormNumber,isReplaceBillModal,isBillFormFound,replaceBill}) {
    //billYears, isRadioSelected
    return (
      <div>
        <section class="box no-padding main-navigation">
          <div class="row main-navigation-row">
            <div class="main-navigation-block">
              <NavigationDropdown currentRoute="/consumer" />
            </div>
            <h6 class="header-color-blue"> # {consumerDetails.consumerNumber || 'Not Available'}</h6>
            {
              consumerDetails.connectionStatus &&
              <span className={connectionStatuses[consumerDetails.connectionStatus].statusClass} style="margin-top:8px" >
                {connectionStatuses[consumerDetails.connectionStatus].statusName || 'Not Available'}</span>
            }
            {
              (consumerDetails.protestFlag && consumerDetails.protestFlag === 'protested') && (
                <span class="tag is-warning" style="margin-top:8px" >D</span>
              )
            }
            {/*<span class="tag">Protested</span>*/}
            <span title="Click here to view consumer information" class="hyperlink" style="margin-top:8px"
              onClick={this.toggleConsumerInfoModal.bind(this)}>Consumer Information</span>
            {/*<span class="hyperlink"> | Location</span>*/}
          </div>
        </section>
        <div class="box no-padding tab-menu">
          <section class="row">
            <div onClick={this.navigateToSubComponent.bind(this, 'billdetails')}
              class={"has-text-center tile fix-width " + (displayViewName === 'billdetails' ? 'active' : '')}>
              <span>View Bill</span>
            </div>
            <div onClick={this.navigateToSubComponent.bind(this, 'history')}
              class={"has-text-center tile fix-width " + (displayViewName === 'history' ? 'active' : '')}>
              <span>Billing & Payment History</span>
            </div>
            {/*
            <div onClick={this.navigateToSubComponent.bind(this, 'connectedload')}
              class={"has-text-center tile fix-width " + (displayViewName === 'connectedload' ? 'active' : '')}>
              <span>Connected Device</span>
            </div>
            */}
            <div onClick={this.navigateToSubComponent.bind(this, 'consumerStatusHistory')}
              class={"has-text-center tile fix-width " + (displayViewName === 'consumerStatusHistory' ? 'active' : '')}>
              <span>Consumer History</span>
            </div>
            {this.state.isBillPresent &&(
              <div onClick={this.navigateToSubComponent.bind(this, 'singleBillHistory')}
                class={"has-text-center tile fix-width " + (displayViewName === 'singleBillHistory' ? 'active' : '')}>
                <span>Bill History</span>
              </div>
            )}
          </section>
          {/*
            displayViewName === "connectedload" && (
              <section>
                <ConnectedLoad consumerID={this.props.matches.consumerID}/>
              </section>
            )
          */}
          {displayViewName === "consumerStatusHistory" && (
            <section>
              <ConsumerStatusHistory consumerID={this.props.matches.consumerID}/>
            </section>
          )}
          {displayViewName === "billdetails" && (
            <div>
              <div class="row">
                <div class="column no-padding tab-block">
                  <div class="box border-top-color-blue">
                    <span>Showing Bill For :
                      <span class="header-color-blue">
                        {
                          (this.state.selectedBillMonth && this.state.selectedBillYear) && (
                            <strong> {billMonths[this.state.selectedBillMonth]} - {this.state.selectedBillYear}</strong>
                          )
                        }
                        {
                          (!this.state.selectedBillMonth || !this.state.selectedBillYear) && (
                            <strong>Not Available</strong>
                          )
                        }
                      </span>
                    </span>
                    <span class="span-margin">Powerdek<sup style="font-size:8px;">TM</sup> Findings
                      <span class="header-color-blue">
                        {
                          consumerBillDetails.billwiseFindingsFlag && (
                            <span class="span-margin">
                              <strong>{consumerBillDetails.billwiseFindingsFlag}</strong>
                              <Link class="hyperlink" onClick={this.onBillwiseFindingsClick.bind(this)}>(View Analysis)</Link>
                            </span>
                          )
                        }
                        {
                          !consumerBillDetails.billwiseFindingsFlag && (
                            <strong>Not Available</strong>
                          )
                        }
                        {
                          consumerBillDetails.status === 'reviewpending' && consumerBillDetails.isEligibleForReplacement &&
                            consumerBillDetails.mapStatus === 'success' && !consumerBillDetails.isEmpty &&
                            consumerBillDetails.consumerStatus === 'verified' &&
                          <button class="span-margin margin-5 button-outline button-small"
                            onClick={this.replaceBill.bind(this)}>Replace</button>
                        }
                        {/* T1420 : Approve button is display condition updated to - button is displayed if totalRoundedBill or payableAmount
                            is greater than 0
                            Developer: Pallavi
                            Date: 04/07/2018
                        */}
                        {/*
                          T1517 - Approved Button is still displayed even if the bill is approved from consumer detail view
                          Developer - Shrutika Khot
                          Date - 21/07/18
                          comment - changed this.state.consumerBillDetails.status === 'paybill' to !== 'paybill'
                        */}
                        {/*
                          T1517 - Normal user is able to approve the bill which is marked as paid outside billwise by the company admin
                          Developer - Shrutika Khot
                          Date - 23/08/18
                          comment - changed this.state.consumerBillDetails.status === 'paidoutsidebillwise' to !== 'paidoutsidebillwise'
                        */}
                        {
                          ((this.state.consumerBillDetails.consumerStatus === 'verified' &&
                          this.state.consumerBillDetails.status !== 'paidoutsidebillwise') &&
                          (this.state.consumerBillDetails.status === 'reviewpending' ||
                           this.state.consumerBillDetails.status === 'unpaid' ||
                           (this.state.consumerBillDetails.status !== 'paybill' && !this.state.consumerBillDetails.billFormID)) &&
                          !this.state.isClientAdmin) &&
                          (consumerBillDetails.payableAmount > 0)  && (
                            <button class="span-margin margin-5 button-outline button-small"
                              onClick={this.toggleReviewBillModal.bind(this)}>Approve</button>
                          )
                        }
                        {
                          this.isProcessBillButtonVisible() && (
                            <button class="span-margin margin-5 button-outline button-small"
                              onClick={this.toggleProtestBillModal.bind(this)}>Protest</button>
                          )
                        }
                        {/*
                          T1644- Mark as paid outside billwise issues.
                          Developer - Shrutika Khot.
                          Date - 23/08/18
                          Comment - Mark As Paid button is displayed only if totalRoundedBill or payableAmount
                          is greater than zero.
                        */}
                        {
                          (this.state.isClientAdmin && consumerBillDetails.status === 'reviewpending' &&
                            consumerBillDetails.status !== 'paidoutsidebillwise' && AppStore.get('userinfo').company.status === 'demo') &&
                            (consumerBillDetails.payableAmount > 0 || consumerBillDetails.totalRoundedBill > 0) &&
                          <button class="span-margin margin-5 button-outline button-small"
                            onClick={this.markAsPaidOutsideBillwise.bind(this, consumerBillDetails._id)}>
                            Mark As Paid
                          </button>
                        }
                        {
                          (this.state.isClientAdmin && consumerBillDetails.status === 'paidoutsidebillwise' &&
                            consumerBillDetails.status !== 'reviewpending' && AppStore.get('userinfo').company.status === 'demo') &&
                          <button class="span-margin margin-5 button-outline button-small"
                            onClick={this.revertStatusToReviewPending.bind(this, consumerBillDetails._id)}>
                            Mark as Review Pending
                          </button>
                        }
                        {
                          consumerBillDetails.consumerStatus === 'verified' && consumerBillDetails.reconciliationStatus === 'notreconciled'
                           && consumerBillDetails.computedDiscomBillPaidStatus &&
                            (<button onClick={this.openReconciliationModal.bind(this)} class="span-margin button-outline button-small">
                            Reconcile
                            </button>)
                        }
                        {
                          consumerBillDetails.reconciliationStatus === 'reconciled' &&
                          <b class="span-margin" style= "text-transform: uppercase;">Reconciled</b>
                        }
                        {
                          consumerBillDetails.isCorrectedBillUploaded && correctedBillUrl && (
                            <a class="hyperlink" href={correctedBillUrl}>
                              <button class="span-margin button-outline button-small">Download Corrected Bill</button>
                            </a>
                          )
                        }
                        {
                          !consumerBillDetails.isCorrectedBillUploaded && consumerBillDetails.consumerStatus === 'verified' && (
                            <button class="span-margin button-outline button-small"
                              onClick={this.toggleUploadCorrectedBillModal.bind(this)}>Upload Corrected Bill</button>
                          )
                        }

                        {
                          consumerBillDetails.billType === 'securitydepositdemand' && consumerBillDetails.consumerStatus === 'verified'
                           && consumerBillDetails.isSecurityDepositBillUploaded && sddBillUrl && (
                            <a class="hyperlink" href={sddBillUrl} download>
                              <button class="span-margin button-outline button-small">Download Security Deposit Bill</button>
                            </a>
                          )
                        }
                        {
                          consumerBillDetails.billType === 'securitydepositdemand' && consumerBillDetails.consumerStatus === 'verified'
                           && !consumerBillDetails.isSecurityDepositBillUploaded && (
                            <button class="span-margin button-outline button-small"
                              onClick={this.toggleUploadSDDBillModal.bind(this)}>Upload Security Deposit Bill</button>
                          )
                        }
                        {
                          this.state.consumerBillDetails.status === 'paid' && this.state.consumerBillDetails.status !== 'paidoutsidebillwise' && (
                            <button class="span-margin margin-5 button-outline button-small"
                              onClick={this.toggleReceiptModal.bind(this)}>View Receipt</button>
                          )
                        }
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              {consumerBillDetails.billType === 'securitydepositdemand' && (
                <div class="row">
                  <div class="column column-66 no-padding tab-block">
                    <div class="box border-top-color-blue" style="border-top:none;text-align:center">
                      <span style="color:red">Bill For :
                        <span>
                          {
                            (this.state.selectedBillMonth && this.state.selectedBillYear) && (
                              <strong> {billMonths[this.state.selectedBillMonth]} - {this.state.selectedBillYear}</strong>
                            )
                          }
                          {
                            (!this.state.selectedBillMonth || !this.state.selectedBillYear) && (
                              <strong>Not Available</strong>
                            )
                          }
                        </span> has Additional Security Deposit Demanded.
                      </span>

                    </div>
                  </div>
                </div>
              )}
              { !(Object.keys(consumerBillDetails).length === 0) &&
                (<div class="row">
                  <div class="column column-66 container no-padding">
                    <form id="printPreviewForm" onSubmit={this.submit.bind(this)} >
                      { consumerBillDetails.html_bill &&
                        (<button class="float-right button-margin-left" type="submit" onClick={this.printWindow.bind(this)}>Print</button>)
                      }
                      <div id="printableArea">
                        <div class="box" >
                          {
                            !consumerBillDetails.html_bill &&
                            (<div>Bill is not available</div>)
                          }
                          {
                            // consumerBillDetails.billType === 'securitydepositdemand' && !consumerBillDetails.isSecurityDepositBillUploaded && (
                            //   <div class="row row-center has-text-center" style="height:70vh">
                            //     <div class="column" style="font-size:1.6rem">
                            //       <b>Bill for Additional Security Deposit Demanded <br /> is Not Available Online.</b>
                            //     </div>
                            //   </div>
                            // )
                          }
                          {
                            consumerBillDetails.html_bill &&
                            (<iframe id="myFrame" srcdoc={consumerBillDetails.html_bill} width="100%"
                              scrolling="no" frameborder="0"  onLoad={this.resizeIframe.bind(this)} />)
                          }
                          {
                            // consumerBillDetails.billType === 'securitydepositdemand' &&
                            //  consumerBillDetails.isSecurityDepositBillUploaded && consumerBillDetails.image_url &&
                            //  (<object id="myObjectData" data={this.state.sddBillUrl}/>)
                          }
                        </div>
                      </div>
                    </form>
                  </div>
                  <div class="column no-padding">


                    <div class="box">
                      <p style="margin-bottom:5px">
                        <strong>Bill Highlights</strong>
                        <span class="tag" style="margin-bottom:8px;padding:0.20rem 0.75rem">{billStatuses[consumerBillDetails.status]}</span>
                      </p>
                      <table>
                        <tbody>
                          {
                            consumerBillDetails.billFormID && (
                              <tr>
                                <td class="table-border-top" style="width: 70%;">Bill Form ID</td>
                                <td class="table-border-top">{customerBillFormNumber || 'Not Available'}</td>
                              </tr>
                            )
                          }
                          <tr>
                            <td class="table-border-top" style="width: 70%;">Meter Status On Bill</td>
                            <td class="table-border-top">{consumerBillDetails.meterStatus || 'Not Available'}</td>
                          </tr>
                          <tr>
                            <td>Billed Amount</td>
                            <td>{(consumerBillDetails.totalRoundedBill === 0 || consumerBillDetails.totalRoundedBill ) ?
                              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.totalRoundedBill)
                              : 'Not Available'}</td>
                          </tr>
                          <tr>
                            <td>Consumed Units</td>
                            {
                              consumerBillDetails.consumerType==='lt'&& (
                                <td>{(consumerBillDetails.billableUnits === 0 || consumerBillDetails.billableUnits ) ? consumerBillDetails.billableUnits
                                  : 'Not Available'}</td>
                              )||(<td>{(consumerBillDetails.totalKwh === 0 || consumerBillDetails.totalKwh ) ? consumerBillDetails.totalKwh
                                : 'Not Available'}</td>)}
                          </tr>
                          <tr>
                            <td>Prompt Payment Date</td>
                            <td>
                              {
                                !consumerBillDetails.promptPaymentDate && (<span>Not Available</span>)
                              }
                              {
                                consumerBillDetails.promptPaymentDate && (<span>
                                  {formatDateTime(consumerBillDetails.promptPaymentDate)}
                                </span>)
                              }
                            </td>
                          </tr>
                          <tr>
                            <td>Due Date</td>
                            <td>
                              {
                                !consumerBillDetails.billDueDate && (<span>Not Available</span>)
                              }
                              {
                                consumerBillDetails.billDueDate && (<span>
                                  {formatDateTime(consumerBillDetails.billDueDate)}
                                </span>)
                              }
                            </td>
                          </tr>
                          <tr>
                            <td>PF Penalty</td>
                            <td> {(consumerBillDetails.pfPenalty === 0 || consumerBillDetails.pfPenalty ) ?
                              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.pfPenalty): 'Not Available'}
                            </td>
                          </tr>
                          <tr>
                            <td>Capacitor Penalty</td>
                            <td>{(consumerBillDetails.capacitorPenalty === 0 || consumerBillDetails.capacitorPenalty ) ?
                              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.capacitorPenalty)
                              : 'Not Available'}</td>
                          </tr>
                          <tr>
                            <td>Security Deposit Demanded</td>
                            <td>{(consumerBillDetails.securityDepositDemanded === 0 || consumerBillDetails.securityDepositDemanded ) ?
                              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.securityDepositDemanded)
                              : 'Not Available'}</td>
                          </tr>
                          <p style="margin-top:20px">
                            <strong>Payment Details on {consumerDetails.discomName || 'Not Available'} Records</strong>
                          </p>
                          <tr>
                            <td class="table-border-top">Amount Paid</td>
                            <td  class="table-border-top">
                              {(consumerBillDetails.computedDiscomBillPaidAmount === 0 || consumerBillDetails.computedDiscomBillPaidAmount ) ?
                                new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.computedDiscomBillPaidAmount)
                                : 'Not Available'}</td>
                          </tr>
                          <tr>
                            <td>Payment Date</td>
                            <td>{(consumerBillDetails.computedDiscomBillPaidDate) ?
                              formatDateTime(consumerBillDetails.computedDiscomBillPaidDate): 'Not Available'}</td>
                          </tr>
                          {/*
                            <tr>
                              <td>Prompt Discount Received</td>
                              <td>{(consumerBillDetails.derivedPromptDiscountReceived === 0 || consumerBillDetails.derivedPromptDiscountReceived ) ?
                                new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.derivedPromptDiscountReceived)
                                : 'Not Available'}</td>
                            </tr>
                            <tr>
                              <td>Late Fees Paid</td>
                              <td>{(consumerBillDetails.derivedLateFeesPaid === 0 || consumerBillDetails.derivedLateFeesPaid ) ?
                                new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(consumerBillDetails.derivedLateFeesPaid)
                                : 'Not Available'}</td>
                            </tr>
                          */}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                )
              }
            </div>
          )}
          {displayViewName === "singleBillHistory" && (
            <section class="row">
              <div class="column">
                {
                  displayViewName === "singleBillHistory" && (
                    <BillHistory billID={this.state.consumerBillDetails._id} consumerID={this.props.matches.consumerID}
                      month={this.state.consumerBillDetails.month} year={this.state.consumerBillDetails.year}
                      createdAt={this.state.consumerBillDetails.createdAt} />
                  )
                }
                {
                  displayViewName === "billhistory" && (<BillHistory />)
                }
              </div>
            </section>
          )}
          {displayViewName !== "billdetails" && (
            <section class="row">
              <div class="column">
                {
                  displayViewName === "history" && (
                    <ConsumerHistory companyID={this.props.matches.companyID} consumerID={consumerDetails._id}
                      viewBillDetails={this.navigateToSubComponent.bind(this)}
                      latestBillMonth={consumerDetails.latestDiscomBillMonth} latestBillYear={consumerDetails.latestDiscomBillYear} />
                  )
                }
              </div>
            </section>
          )}
        </div>
        {
          !isReviewBillModal &&
            <Modal title="Approve Bill" modalSize="is-medium" onClose={this.toggleReviewBillModal.bind(this)}>
              <form name="reviewBill" onSubmit={this.reviewBillSubmit.bind(this)}>
                <ModalBody>
                  <div>
                    To pay the bill, please select following option -
                  </div>
                  <div class="review-bill">
                    {
                      consumerBillDetails.status !== 'paybill' &&
                      (<label for="payBill">
                        <input type="radio" name="reviewBill" value="paybill" checked={this.state.reviewBill === 'paybill'}
                          onChange={this.getBillStatus.bind(this)} /> Pay Bill
                      </label>)
                    }
                    {/* consumerBillDetails.status !== 'unpaid' &&
                      (<label for="payBill">
                        <input type="radio" name="reviewBill" value="unpaid" checked={this.state.reviewBill === 'unpaid'}
                          disabled={consumerBillDetails.billFormID} onChange={this.getBillStatus.bind(this)} /> Hold Bill
                      </label>)
                    */}
                  </div>

                  {
                    this.state.reviewBill === 'paybill' && billType === 'regular' &&
                      <div>
                      Select Amount to be Paid
                        <div class="row">
                          <div class="column column-20">
                            <input type="radio" name="promptPayment" value="promptPaymentAmount"
                              checked={this.state.regularBillPayableAmount === 'promptPaymentAmount'}
                              onChange={this.getAmountToBePaid.bind(this)}/> Prompt Payment Amount
                              ({
                              (amount.promptPaymentAmount || amount.promptPaymentAmount === 0) &&
                                (new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount.promptPaymentAmount)) || '-'
                            })
                          </div>
                          <div class="column column-20">
                            <input type="radio" name="billDueAmount" value="billDueAmount"
                              checked={this.state.regularBillPayableAmount === 'billDueAmount'}
                              onChange={this.getAmountToBePaid.bind(this)}/> Bill Due Amount<br />
                              ({
                              (amount.billDueAmount || amount.billDueAmount === 0) &&
                                (new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount.billDueAmount)) || '-'
                            })
                          </div>
                          <div class="column column-20">
                            <input type="radio" name="latePaymentAmount" value="latePaymentAmount"
                              checked={this.state.regularBillPayableAmount === 'latePaymentAmount'}
                              onChange={this.getAmountToBePaid.bind(this)}/> Late Payment Amount
                              ({
                              (amount.latePaymentAmount || amount.latePaymentAmount === 0) &&
                                (new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount.latePaymentAmount)) || '-'
                            })
                          </div>
                          <div class="column column-20">
                            <input type="radio" name="totalCurrentBill" value="totalCurrentBill"
                              checked={this.state.regularBillPayableAmount === 'totalCurrentBill'}
                              onChange={this.getAmountToBePaid.bind(this)}/> Current Amount<br />
                              ({
                              (amount.totalCurrentBill || amount.totalCurrentBill === 0) &&
                                (new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount.totalCurrentBill)) || '-'
                            })
                          </div>
                          <div class="column column-20">
                            <input type="radio" name="other" value="other" checked={this.state.regularBillPayableAmount === 'other'}
                              onChange={this.getAmountToBePaid.bind(this)}/> Other
                          </div>
                        </div>
                        <div>
                          <input type="number" placeholder="Enter Amount To Be Paid" name="payableAmount" step="0.01" min="1"
                            required value={this.state.payableAmount} disabled={!this.state.isOtherSelected} class="no-spinners"
                            onInput={linkState(this, 'payableAmount','target.value')} />
                        </div>
                      </div>
                  }
                  {
                    this.state.reviewBill === 'paybill' && billType === 'securitydepositdemand' &&
                      <div>
                      Select Amount to be Paid
                        <div>
                          <input type="radio" name="securityDepositDemanded" value="securityDepositDemanded"
                            checked={this.state.sddBillPayableAmount === 'securityDepositDemanded'}
                            onChange={this.getAmountToBePaid.bind(this)}/> Security Deposit Demanded
                            ({
                            (amount.securityDepositDemanded || amount.securityDepositDemanded === 0) &&
                              (new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount.securityDepositDemanded)) || '-'
                          })
                          <input type="radio" name="other" value="other" checked={this.state.sddBillPayableAmount === 'other'}
                            onChange={this.getAmountToBePaid.bind(this)}/> Other
                        </div>
                        <div>
                          <input type="number" step="0.01" min="1" placeholder="Enter Amount To Be Paid" name="payableAmount"
                            required value={this.state.payableAmount} disabled={!this.state.isOtherSelected} class="no-spinners"
                            onInput={linkState(this, 'payableAmount','target.value')} />
                        </div>
                      </div>
                  }
                </ModalBody>
                <ModalFooter>
                  <button  disabled={!this.state.billStatusSelected} type="submit">Save</button>
                </ModalFooter>
              </form>
            </Modal>
        }



        {
          !isProtestBillModal &&
            <Modal title="Protest Bill" modalSize="is-medium" onClose={this.toggleProtestBillModal.bind(this)}>
              <form name="protestBill" onSubmit={this.protestBillSubmit.bind(this)}>
                <ModalBody>
                  <div>
                    To protest the bill, please check the following option:
                  </div>
                  <div>
                    <input type="radio" name="protestBill" value="tobeprotested"
                      checked={this.state.protestBill === 'tobeprotested' || this.state.protestBill === 'protested'}
                      onChange={this.getBillToBeProtest.bind(this)} disabled={this.state.protestBill === 'protested'} /> To Be Protest Bill
                    <input type="radio" name="protestBill" value="" checked={this.state.protestBill === '' ||  this.state.protestBill === 'donotprotest'}
                      onChange={this.getBillToBeProtest.bind(this)} disabled={this.state.protestBill === 'protested'} /> Do Not Protest
                  </div>
                  <div>
                    {
                      ((this.state.protestBill === "tobeprotested" && this.state.currentProtestFlag !== 'tobeprotested')
                      || (this.state.currentProtestFlag ==="tobeprotested" && this.state.protestBill === "")) &&
                      (<textarea rows="2" value={this.state.comment} placeholder="Leave a comment" name="comment"
                        onInput={linkState(this, 'comment', 'target.value')} required />)
                    }
                  </div>
                  {
                    ((this.state.protestBill === "tobeprotested" && this.state.currentProtestFlag !== 'tobeprotested')
                    || (this.state.currentProtestFlag ==="tobeprotested" && this.state.protestBill === "")) &&
                    (<div>
                      Upload File: <input type="file" name="protestFile" value={this.state.protestFile} accept=".pdf,.jpg,.jpeg"
                        onChange={this.getFileAndCheckFileSize.bind(this)} />
                    </div>)
                  }

                </ModalBody>
                <ModalFooter>
                  <button type="button" class="button-clear" onClick={this.toggleProtestBillModal.bind(this)}>Cancel</button>
                  <button  disabled={!this.state.billStatusSelected} type="submit">Save</button>
                </ModalFooter>
              </form>
            </Modal>
        }


        {
          isConsumerInfoModalOpen &&
            <Modal title="Consumer Information" onClose={this.toggleConsumerInfoModal.bind(this)}>
              <ModalBody>
                <section class="row">
                  <div class="column">
                    <h6>Basic Info</h6>
                    <p>
                      Name: {consumerDetails.name || 'Not Available'}
                    </p>
                    {/*<p>
                      Location: {consumerDetails.shortLocation || 'Not Available'}
                    </p>*/}
                    <p>
                      Date of Connection: {formatDateTime(consumerDetails.dateOfConnection)}
                    </p>
                    <p>
                      Ward: {consumerDetails.wardName || 'Not Available'}
                    </p>
                    <p>
                      Zone: {consumerDetails.zoneName || 'Not Available'}
                    </p>
                    {/*
                      ((this.state.organizationCreationMethod === 'wardwise' || this.state.organizationCreationMethod === 'zonewardwise')) && (
                        <p>
                          Ward: {consumerDetails.wardName || 'Not Available'}
                        </p>
                      )*/}
                    {/*
                      ((this.state.organizationCreationMethod === 'zonewise' || this.state.organizationCreationMethod === 'zonewardwise')) && (
                        <p>
                          Zone: {consumerDetails.zoneName || 'Not Available'}
                        </p>
                      )*/}
                    <p>
                      Department: {consumerDetails.departmentName || 'Not Available'}
                    </p>
                  </div>
                  <div class="column">
                    <h6>Meter Info</h6>
                    <p>
                      Status: {consumerDetails.meterStatus || 'Not Available'}
                    </p>
                    <p>
                      Number: {consumerDetails.meterNumber || 'Not Available'}
                    </p>
                    <p>
                      Tariff Categary: {consumerDetails.tariffCategory || 'Not Available'}
                    </p>
                    <p>
                      Connection Type: {consumerDetails.connectionType && (consumerDetails.connectionType.toUpperCase()) || 'Not Available'}
                    </p>
                    <p>
                      Connection Status: {connectionStatuses[consumerDetails.connectionStatus].statusName || 'Not Available'}
                    </p>
                  </div>
                  <div class="column">
                    <h6><abbr title="Additional">Addl.</abbr> Info</h6>
                    <p>
                      Remark: {consumerDetails.remark || 'Not Available'}
                    </p>
                    <p>
                      Source: {consumerDetails.source || 'Not Available'}
                    </p>
                    <p>
                      DISCOM: {consumerDetails.discomName || 'Not Available'}
                    </p>
                    <p>
                      Billing Unit: {consumerDetails.discomDivisionNumber || 'Not Available'}
                    </p>
                    <p>
                      Budget Category: {consumerDetails.budgetCategoryName || 'Not Available'}
                    </p>
                    <p>
                      Last Bill: {((consumerDetails.latestDiscomBillMonth && billMonths[consumerDetails.latestDiscomBillMonth]
                         + ' ' + consumerDetails.latestDiscomBillYear)) || 'Not Available'}
                    </p>
                  </div>
                </section>
              </ModalBody>
            </Modal>
        }
        {
          isBillwiseFindingsModalOpen && (
            <Modal title="Powerdek Findings" onClose={this.toggleBillwiseFindingsModal.bind(this)}>
              <form name="Analysis Form">
                <ModalBody>
                  <div class="modal-scrollable">
                    <table style="padding-bottom:10px;">
                      <thead>
                        <tr>
                          <th>Validation Rule</th>
                          <th>Result</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          (billwiseFindingsList.map((row) => (
                            <tr>
                              <td>
                                <abbr>{row.name}</abbr>
                              </td>
                              <td>
                                <em className={billwiseFindingsFlagClasses[row.result].iconClass} />
                                {billwiseFindingsFlagClasses[row.result].name}
                              </td>
                              <td>{row.value}</td>
                            </tr>
                          )))
                        }
                        {
                          !billwiseFindingsList.length && this.state.loadingBillwiseFindingsList && (
                            <span>Loading...</span>
                          )
                        }
                        {
                          !billwiseFindingsList.length && !this.state.loadingBillwiseFindingsList && (
                            <span>No Data Found</span>
                          )
                        }
                      </tbody>
                    </table>
                  </div>
                </ModalBody>
              </form>
            </Modal>
          )
        }
        {
          isUploadCorrectedBillModalOpen &&
            <Modal title="Upload Corrected Bill" modalSize="is-small" onClose={this.toggleUploadCorrectedBillModal.bind(this)}>
              <form name="uploadCorrectedBillForm" onSubmit={this.onCorrectedBillUpload.bind(this)}>
                <ModalBody>
                  <div>
                    Upload Corrected Bill
                    <input type="file" name="correctedBill" accept=".pdf,.jpg,.jpeg" required
                      onChange={this.isFileSizeValid.bind(this)} value={this.state.correctedBill}/>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button type="submit">Upload</button>
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.isUploadSDDBillModalOpen &&
            <Modal title="Upload Security Deposit Bill" modalSize="is-small" onClose={this.toggleUploadSDDBillModal.bind(this)}>
              <form name="uploadSDDBillForm" onSubmit={this.onSDDBillUpload.bind(this)}>
                <ModalBody>
                  <div>
                    Upload Security Deposit Bill
                    <input type="file" name="sddBill" accept=".pdf" required
                      onChange={this.isFileSizeValid.bind(this)} value={this.state.sddBill}/>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button type="submit">Upload</button>
                </ModalFooter>
              </form>
            </Modal>
        }
        {
          this.state.reconciliationModal && (
            <Modal title="Reconciliation Details" onClose={this.toggleReconciliationModal.bind(this)}>
              <form name="reconciliationDetails" onSubmit={this.reconcileAndCreateReport.bind(this)}>
                <ModalBody>
                  <h6>Energy Consumption Statement</h6>
                  <div class="row">
                    <table class="vert-horiz-border-table">
                      <thead>
                        <tr>
                          <th rowspan="2" class="has-text-center">Consumer Number</th>
                          <th colspan="2" class="has-text-center">Bill Parameters</th>
                          <th colspan="3" class="has-text-center">Deviation Against</th>
                        </tr>
                        <tr>
                          <th>Units</th>
                          <th>Last Year Same Month Units</th>
                          <th>Average of last 12 months</th>
                          <th>Confirmation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          reportData.map((row) => (
                            <tr>
                              <td>{row.consumerNumber}</td>
                              <td>{((row.consumerType === 'lt' && row.billableUnits || row.billableUnits === 0) ?
                                row.billableUnits : row.totalKwh || 'Not Available')}</td>
                              <td>{(row.lastYearSameMonthUnits || row.lastYearSameMonthUnits === 0) ? row.lastYearSameMonthUnits : 'Not Available'}</td>
                              <td>{(row.averageUnits || row.averageUnits === 0) ? row.averageUnits : 'Not Available'}</td>
                              <td>
                                {
                                  row.confirmation === '' &&
                                  <span>
                                    <button type="button" onClick={this.changeConfirmation.bind(this, row, 'ok')}
                                      class="button-outline button-small">OK</button>
                                    <button type="button" onClick={this.changeConfirmation.bind(this, row, 'notok')}
                                      class="button-outline button-small">NOT OK</button>
                                  </span>
                                }
                                {
                                  row.confirmation === 'ok' &&
                                  <span>OK</span>
                                }
                                {
                                  row.confirmation === 'notok' &&
                                  <span>NOT OK</span>
                                }
                              </td>
                            </tr>))
                        }
                      </tbody>
                    </table>
                  </div>
                  <br />
                  <h6>Energy Reconciliation Statement</h6>
                  <div class="row">
                    <table class="vert-horiz-border-table">
                      <thead>
                        <tr>
                          <th rowspan="2" class="has-text-center">Consumer Number</th>
                          <th colspan="2" class="has-text-center">Bill Parameters</th>
                          <th colspan="5" class="has-text-center">Payment Parameters</th>
                          <th colspan="4" class="has-text-center">Receipt Parameters</th>
                          <th rowspan="2" class="has-text-center">Receipt Amount in bill wise</th>
                        </tr>
                        <tr>
                          <th>Units</th>
                          <th>Demand</th>
                          <th>Instrument Date</th>
                          <th>Instrument Number</th>
                          <th>Paid Amount</th>
                          <th>Difference</th>
                          <th>Reason</th>
                          <th>Receipt Date</th>
                          <th>Amount on Receipt</th>
                          <th>Difference</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          reportData.map((row) => (
                            <tr>
                              <td>{row.consumerNumber}</td>
                              <td>{((row.consumerType === 'lt' && row.billableUnits || row.billableUnits === 0) ?
                                row.billableUnits : row.totalKwh || 'Not Available')}</td>
                              <td>{getFormattedAmount(row.totalRoundedBill)}</td>
                              <td>{formatDateTime(row.paymentInstrumentDate) || 'Not Available'}</td>
                              <td>{row.paymentModeReferenceNumber || 'Not Available'}</td>
                              <td>{getFormattedAmount(row.payableAmount)}</td>
                              <td>{getFormattedAmount(row.differenceOfDemandAndPaidAmount)}</td>
                              <td><input type="text" value={row.paymentParamReason} name="paymentParamReason"
                                onChange={this.setPaymentParamReason.bind(this, row)} placeholder="Reason"/></td>
                              <td>{formatDateTime(row.computedDiscomBillPaidDate) || 'Not Available'}</td>
                              <td>{getFormattedAmount(row.computedDiscomBillPaidAmount)}</td>
                              <td>{getFormattedAmount(row.differenceOfPaidAmountAndReceiptAmount)}</td>
                              <td><input type="text" value={row.receiptParamReason} name="receiptParamReason"
                                onChange={this.setReceiptParamReason.bind(this, row)} placeholder="Reason"/></td>
                              <td>{(row.actualAmountPaid ? getFormattedAmount(row.actualAmountPaid) : 'Not Available')}</td>
                            </tr>))
                        }
                      </tbody>
                    </table>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button type="submit" disabled={!reportData.length}>Save</button>
                </ModalFooter>
              </form>
            </Modal>
          )
        }

        {
          /*
            T1520: Bill form Summary pop-up is not displayed if the bill is replaced form the consumer detail view
            Developer Name - Shrutika Khot
            Date: 21/07/18
          */
          isReplaceBillModal &&
            <Modal title="Bill Form Summary" modalSize="is-medium" onClose={this.toggleReplaceBillModal.bind(this)}>
              <form name="billFormSummary">
                <ModalBody>
                  {
                    isBillFormFound && (
                      <div>
                        <p>Billform Number : <strong>{replaceBill.billFormNumber}</strong></p>
                        <p>Budget Category : <strong>{replaceBill.budgetCategory}</strong></p>
                        <p>Total Amount of Bill Form : <strong>{getFormattedAmount(replaceBill.totalAmount)}</strong></p>
                        <p>Amount to be paid for this bill : <strong>{getFormattedAmount(replaceBill.thisBillAmount)}</strong></p>
                      </div>
                    )
                  }
                  {
                    !isBillFormFound && (
                      <p>Last month bill for this consumer has been ether removed from billform or the bill form is void</p>
                    )
                  }
                </ModalBody>
                <ModalFooter>
                  {
                    isBillFormFound && (
                      <div>
                        <button type="reset" class="button-clear" onClick={this.toggleReplaceBillModal.bind(this)}>Cancel</button>
                        <button type="submit" onClick={this.beforeReplacingBill.bind(this)}>OK</button>
                      </div>
                    )
                  }
                  {
                    !isBillFormFound && (
                      <button type="button" onClick={this.toggleReplaceBillModal.bind(this)}>OK</button>
                    )
                  }
                </ModalFooter>
              </form>
            </Modal>
        }

        {
          this.state.isReplaceSummaryModal &&
          <Modal title="Bill Replacement Summary" modalSize="is-small" onClose={this.onSummaryOkClick.bind(this)}>
            <ModalBody>
              <div class="row">
                <div class="column">
                  <h6>Replacement Summary</h6><br />
                  Consumer Number: <strong>{successResponse.updatedBills[0].consumerNumber}</strong> <br />
                  Bill Form:
                  <strong>
                    <Link class="hyperlink" href={`/billform/${successResponse.billForm._id}`}>
                      {successResponse.billForm.customerBillFormNumber}
                    </Link>
                  </strong> <br />
                  <span>{successResponse.updatedBills[1].summaryMessage} </span> <br />
                  <span>{successResponse.updatedBills[0].summaryMessage} </span> <br />
                  <span>
                    Consumed Amount before removing bill:
                    {getFormattedAmount(successResponse.amountBeforeRemoving)}
                  </span> <br />
                  <span>
                    Consumed Amount after removing bill:
                    {getFormattedAmount(successResponse.updatedBudgets[0].consumedAmount)}
                  </span> <br />
                  <span>
                    Consumed Amount after adding bill:
                    {getFormattedAmount(successResponse.updatedBudgets[0].consumedAmount + successResponse.updatedBills[1].payableAmount)}
                  </span>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button onClick={this.onSummaryOkClick.bind(this)}>OK</button>
            </ModalFooter>
          </Modal>
        }
        {
          this.state.isReceiptModalOpen && (
            <Modal title="Payment Confirmation" modalSize="is-medium" onClose={this.toggleReceiptModal.bind(this)}>
              <ModalBody>
                <div id="receipt">
                  <div id="receiptLogo" style="display: flex;padding: 0;width: 100%;">
                    <div style="padding: 0; width: 100% ; textalign:left">
                      <img src="/assets/static/bom_logo.png" style="width: 130px; height: 50px;"/>
                    </div>
                    <div style=" padding: 0; width: 100% ;  text-align:right" >
                      <img src="/assets/static/bbps_logo.png" style="width: 130px; height:40px;"/>
                    </div>
                  </div>
                  <div style="margin-bottom:5px display: flex;flex-direction: column;padding: 0;width: 100%; margin-top:25px;">
                    <div style=" padding: 0; width: 100% ; ">
                      <label style="font-weight:normal;font-size:1em ; line-height:25px; ">
                        <strong>Thank you!</strong><br/>
                        We have received your payment. Please note your Transaction Reference ID for any queries for below transaction.
                      </label>
                    </div>
                  </div>
                  <div style ="display: flex;flex-direction: column;padding: 0;width: 100%; border: 1px dashed grey;  margin-top: 10px;">
                    <div style=" display: block; flex: 1 1 auto;margin-left: 0;max-width: 100%;width: 100%;  padding: 0!important;">
                      <div style ="display: flex;flex-direction: column;padding: 0;width: 100%; border-bottom:1px dashed grey;">
                        <div style=" display: block; flex: 1 1 auto;margin-left: 0;max-width: 100%;width: 100%;">
                          <label style="display: block;align-items: baseline;font-size: 1rem; font-weight: 700; padding-top: 3px; padding-left: 6px;">
                          Transaction Details</label>
                        </div>
                      </div>
                      <div style="display: flex; padding: 0; width: 100% ;">
                        <div style="padding: 10px; display: block; flex: 1 1 auto; border-right:1px dashed grey; margin-left: 0 ;max-width: 100%;\
                        width: 100%;margin-bottom: inherit; padding: 0 .5rem;">
                          <p style="font-weight: normal;font-size: 1em;">Status</p>
                          <p style="font-weight: normal;font-size: 1em;">Name of the Customer</p>
                          <p style="font-weight: normal;font-size: 1em;">Consumer Number</p>
                          <p style="font-weight: normal;font-size: 1em;">Mobile Number</p>
                          <p style="font-weight: normal;font-size: 1em;">Payment Mode</p>
                          <p style="font-weight: normal;font-size: 1em;">Payment Channel</p>
                          <p style="font-weight: normal;font-size: 1em;">Bill Date</p>
                          <p style="font-weight: normal;font-size: 1em;">Transaction ID</p>
                          <p style="font-weight: normal;font-size: 1em;">Bill Amount</p>
                          <p style="font-weight: normal;font-size: 1em;">Customer Convenience Fee</p>
                          <p style="font-weight: normal;font-size: 1em;">Total Amount</p>
                          <p style="font-weight: normal;font-size: 1em;">Transaction Date and Time</p>
                          <p style="font-weight: normal;font-size: 1em;">BBPS Reference Number</p>
                        </div>

                        <div style="padding: 10px; display: block; flex: 1 1 auto; margin-left: 0 ;max-width: 100%; width: 100%;\
                        margin-bottom: inherit; padding: 0 .5rem;">
                          <p style="font-weight: normal;font-size: 1em;">{consumerBillDetails.status}</p>
                          <p style="font-weight: normal;font-size: 1em;">{consumerBillDetails.consumerName}</p>
                          <p style="font-weight: normal;font-size: 1em;">{consumerBillDetails.consumerNumber}</p>
                          <p style="font-weight: normal;font-size: 1em;">{consumerBillDetails.mobileOrEmail ? consumerBillDetails.mobileOrEmail : '-'}</p>
                          <p style="font-weight: normal;font-size: 1em;">Online</p>
                          <p style="font-weight: normal;font-size: 1em;">-</p>
                          <p style="font-weight: normal;font-size: 1em;">{formatDateTime(consumerBillDetails.billDate)}</p>
                          <p style="font-weight: normal;font-size: 1em;">{consumerBillDetails.bomPayBillTransactionId}</p>
                          <p style="font-weight: normal;font-size: 1em;">{getFormattedAmount(consumerBillDetails.payableAmount)}</p>
                          <p style="font-weight: normal;font-size: 1em;">-</p>
                          <p style="font-weight: normal;font-size: 1em;">{getFormattedAmount(consumerBillDetails.payableAmount)}</p>
                          <p style="font-weight: normal;font-size: 1em;">
                            {consumerBillDetails.bomPayBillTransactionDate + ' ' + consumerBillDetails.bomPayBillTransactionTime}</p>
                          <p style="font-weight: normal;font-size: 1em;">{consumerBillDetails.bomPayBillBbpsReferenceNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
                <ModalFooter>
                  <div class="row">
                    <button type="button" onClick={this.printReceipt.bind(this)}>Print</button>
                    <div class="column no-padding">
                      <button onClick={this.toggleReceiptModal.bind(this)} type="button">Close</button>
                    </div>
                  </div>
                </ModalFooter>
              </ModalBody>
            </Modal>
          )
        }
      </div>
    );
  }
}
