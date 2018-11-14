import { h, Component } from 'preact';
import CONSTANTS from '../../lib/constants';
// import { Link } from 'preact-router';
import http from 'fetch-bb';
import {getFormattedAmount, startLoader, stopLoader, formatDateTime} from '../../lib/utils';
import { Modal, ModalBody, ModalFooter } from '../../components/modal';

export default class ConsumerHistory extends Component {

  getConsumerHistory() {
    if (this.props.companyID) {
      return http.get(`${CONSTANTS.API_URL}/api/admin/consumer/${this.props.consumerID}/history`, {companyID: this.props.companyID})
        .then((response) => {
          this.setState({
            consumerHistoryList: response
          });
        });
    }
    return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.consumerID}/history`)
      .then((response) => {
        this.setState({
          consumerHistoryList: response
        });
      });
  }

  getConsumerBills() {
    if (this.state.selectedBillYear && this.state.selectedBillMonth) {
      startLoader();
      this.setState({
        loadingConsumerBillsList: true
      });
      const params = {
        sort: '-year,-month',
        year: this.state.selectedBillYear,
        month: this.state.selectedBillMonth,
        noLimit: 'noLimit',
        billType: 'regular'
      };
      if (this.props.companyID) {
        params.companyID = this.props.companyID;
        return http.get(`${CONSTANTS.API_URL}/api/admin/consumer/${this.props.consumerID}/bill`, params)
          .then((response) => {
            response = response.reverse();
            this.setState({
              consumerBillsList: response,
              loadingConsumerBillsList: false
            });
            this.getPrepareChartData();
          });
      }
      return http.get(`${CONSTANTS.API_URL}/api/consumer/${this.props.consumerID}/bill`, params)
        .then((response) => {
          response = response.reverse();
          this.setState({
            consumerBillsList: response,
            loadingConsumerBillsList: false
          });
          this.getPrepareChartData();
        });
    }
  }

  getPrepareChartData() {
    this.setState({
      labels: [],
      consumedUnitdata: [],
      billAmountData: []
    });
    this.state.consumerBillsList.map((bills) => {
      if (bills.billType === 'regular' && bills.billMonth) {
        this.state.labels.push(bills.billMonth);
        if (bills.billableUnits || bills.billableUnits === 0) this.state.consumedUnitdata.push(bills.billableUnits);
        if (bills.totalKwh || bills.totalKwh === 0) this.state.consumedUnitdata.push(bills.totalKwh);
        if (bills.totalRoundedBill || bills.totalRoundedBill === 0) this.state.billAmountData.push(bills.totalRoundedBill);
      }
    });
    this.plotBillAmountGraph();
    this.plotConsumedUnitGraph();
  }

  setBillYearsArray() {
    let currentYear = new Date().getFullYear();
    let lowerLimit = 2015;
    for (currentYear; currentYear >= lowerLimit; currentYear--) {
      this.state.billYears.push(currentYear);
    }
  }

  onBillMonthChange(e) {
    e.preventDefault();
    this.setState({selectedBillMonth: e.target.value});
    this.getConsumerBills();
  }

  onBillYearChange(e) {
    e.preventDefault();
    this.setState({selectedBillYear: e.target.value});
    this.getConsumerBills();
  }

  plotBillAmountGraph() {
    if (this.state.billAmountChart) this.state.billAmountChart.destroy();
    const ctx = this.amountCanvas.getContext('2d');
    this.state.billAmountChart = this.plotGraph('billAmountGraph', ctx, this.state.labels, this.state.billAmountData);
  }

  plotConsumedUnitGraph() {
    if (this.state.consumedUnitChart) this.state.consumedUnitChart.destroy();
    const ctx = this.conUnitCanvas.getContext('2d');
    this.state.consumedUnitChart = this.plotGraph('consumedUnitGraph', ctx, this.state.labels, this.state.consumedUnitdata);
  }

  plotGraph(type, ctx, labelData, graphData) {
    stopLoader();
    let labelName = '', labelValue = '';
    if (type === 'consumedUnitGraph') {
      labelName = 'Consumed Unit';
    }
    if (type === 'billAmountGraph') {
      labelName = 'Bill Amount';
    }
    return new Chart(ctx,{
      type: 'line',
      data: {
        labels: labelData,
        datasets: [
          {
            borderColor: '#35B9E9',
            data: graphData
          }
        ]
      },
      options: {
        responsive: true,
        hover: {
          mode: 'label'
        },
        legend: { display: false },
        title: {
          display: true,
          text: labelName
        },
        tooltips: {
          enabled: true,
          callbacks: {
            label: (tooltipItem, data) => {
              if (type === 'consumedUnitGraph') {
                labelValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
              }
              if (type === 'billAmountGraph') {
                labelValue = getFormattedAmount(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]);
              }
              return labelName + ' : ' + labelValue ;
            }
          }
        }
      }
    });
  }

  componentWillMount() {
    this.state = {
      consumerHistoryList: [],
      consumerBillsList: [],
      currentPageNo: 1,
      totalPages: 0,
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
      backgroundColor: [
        '#0C546E', '#107093', '#169ACA', '#35B9E9', '#6CCCEF', '#A3DFF5', '#031e28', '#041e28', '#2d5c6c', '#7bc6e0',
        '#062a37', '#2492ba', '#041217', '#0e6584', '#1387b0', '#073242', '#8bd4ed', '#021016', '#2fb1df', '#0d5e7c'
      ],
      labels: [],
      consumedUnitdata:[],
      billAmountData:[],
      billAmountChart:'',
      consumedUnitChart:'',
      loadingConsumerBillsList: false,
      transactionDetails: {}
    };
  }




  componentDidMount() {
    // this.getConsumerHistory();
    this.setState({
      selectedBillMonth: Number(this.props.latestBillMonth),
      selectedBillYear: Number(this.props.latestBillYear),
      width: '400',
      height: '250',
      labels: [],
      consumedUnitdata:[],
      billAmountData:[],
      isReceiptModalOpen: false
    });

    this.setBillYearsArray();
    this.getConsumerBills();
  }

  viewReceipt(bill) {
    this.setState({isReceiptModalOpen: !this.state.isReceiptModalOpen,
      transactionDetails: {
        status: bill.status,
        consumerName: bill.consumerName,
        consumerNumber: bill.consumerNumber,
        mobileOrEmail: bill.mobileOrEmail ? bill.mobileOrEmail : '-',
        paymentMode: 'Online',
        paymentChannel: '-',
        billDate: bill.billDate,
        transactionID: bill.bomPayBillTransactionId,
        billAmount: bill.payableAmount,
        customerConvenienceFee: '-',
        totalAmount: bill.payableAmount,
        transactionDateTime: bill.bomPayBillTransactionDate + ' ' + bill.bomPayBillTransactionTime,
        bbpsReferenceNumber: bill.bomPayBillBbpsReferenceNumber
      }
    });

  }

  toggleReceiptModal() {
    this.setState({isReceiptModalOpen: !this.state.isReceiptModalOpen});
  }

  printReceipts() {
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

  render({}, {consumerBillsList, billMonths, billYears, transactionDetails}) {
    const columns = [
      'Bill Month', 'Meter Status', 'Consumed Units', 'Billed Amount', 'Paid Amount', 'Powerdek Payment Date', 'Receipt Number', 'Receipt Date',
      'Receipt Details'];
    const width = this.state.width;
    const height = this.state.height;
    return (
      <div>
        <div class="row">
          <div class="column no-padding">
            <div class="box border-top-color-blue">
              <form name="billMonthYearFilterForm">
                Showing 12 months history up to
                <select name='billMonth' value={this.state.selectedBillMonth} onChange={this.onBillMonthChange.bind(this)} style="width:auto">
                  {
                    Object.keys(billMonths).map((month) =>
                      ( <option value={month} selected={this.state.selectedBillMonth}>{billMonths[month]}</option>))
                  }
                </select>
                <select name='billYear' value={this.state.selectedBillYear} onChange={this.onBillYearChange.bind(this)} style="width:auto;">
                  {
                    billYears.map((year) =>
                      ( <option value={year} selected={this.state.selectedBillYear}>{year}</option>))
                  }
                </select>
              </form>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="column column-50">
            <div>
              <h6>Consumed Unit</h6>
              <canvas ref={conUnitCanvas => this.conUnitCanvas = conUnitCanvas} width={width} height={height} />
            </div>
          </div>
          <div class="column column-50">
            <div>
              <h6>Bill Amount</h6>
              <canvas ref={amountCanvas => this.amountCanvas = amountCanvas} width={width} height={height} />
            </div>
          </div>
        </div>
        <br/>
        <div class="row">
          <div class="column table-responsive">
            <table>
              <thead>
                <tr>
                  {
                    columns.map((col) => (<th>{col}</th>))
                  }
                </tr>
              </thead>
              <tbody>
                {
                  !consumerBillsList.length && this.state.loadingConsumerBillsList && (
                    <span>Loading...</span>
                  )
                }
                { !consumerBillsList.length && !this.state.loadingConsumerBillsList && (<div>No data present</div>) }
                {
                  consumerBillsList.map((bill) => (
                    <tr>
                      <td>
                        { !this.props.companyID && (
                          <a target="_blank" href={`/consumer/${bill.consumerID}/${bill.month}/${bill.year}/${bill.billType}`}>
                            {billMonths[bill.month]}-{bill.year}
                          </a>
                        )}
                        { this.props.companyID && (
                          <a target="_blank"
                            href={`/admin/company/${this.props.companyID}/consumer/${this.props.consumerID}/${bill.month}/${bill.year}/${bill.billType}`}>
                            {billMonths[bill.month]}-{bill.year}
                          </a>
                        )}
                      </td>
                      <td>{bill.meterStatus || '-'}</td>
                      <td>{((bill.billableUnits || bill.billableUnits === 0) ? bill.billableUnits : bill.totalKwh || '-')}</td>
                      <td>{getFormattedAmount(bill.totalRoundedBill)}</td>
                      <td>{getFormattedAmount(bill.computedDiscomBillPaidAmount)}</td>
                      <td>
                        {
                          bill.receiptDate && (
                            <span>{bill.receiptDate}</span>
                          )
                        }
                        {
                          !bill.receiptDate && (<span>-</span>)
                        }
                      </td>
                      <td>{bill.receiptNumber || '-'}</td>
                      <td>
                        {
                          bill.receiptDate && (
                            <span>{bill.receiptDate} (View Receipt)</span>
                          )
                        }
                        {
                          !bill.receiptDate && (<span>-</span>)
                        }
                      </td>
                      <td>
                        {
                          bill.status === 'paid' && (
                            <button class="span-margin margin-5 button-outline button-small"
                              onClick={this.viewReceipt.bind(this, bill)}>View Receipt</button>
                          )
                        }
                        {
                          bill.status !== 'paid' && (
                            <span>-</span>
                          )
                        }
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
        {
          this.state.isReceiptModalOpen && (
            <Modal title="Payment Confirmation" modalSize="is-medium" onClose={this.toggleReceiptModal.bind(this)}>
              <ModalBody>
                <div id="receipt">
                  <div style="display: flex;padding: 0;width: 100%;">
                    <div style="padding: 0; width: 100% ; textalign:left">
                      <img src="/assets/static/bom_logo.png" style="width: 130px; height: 50px;"/>
                    </div>
                    <div style=" padding: 0; width: 100% ;  text-align:right">
                      <img src="/assets/static/bbps_logo.png" style="width: 130px; height:40px;"/>
                    </div>
                  </div>
                  <div style="margin-bottom:5px display: flex;flex-direction: column;padding: 0;width: 100%; margin-top:25px;">
                    <div style=" padding: 0; width: 100% ; ">
                      <label style="font-weight:normal;font-size:1em ; line-height:25px; ">
                        <strong>Thank you!</strong><br/>
                        We have received your payment request. Please note your Transaction Reference ID for any queries for below transaction
                      </label>
                    </div>
                  </div>
                  <div style ="display: flex;flex-direction: column;padding: 0;width: 100%; border: 1px dashed grey;  margin-top: 10px;">
                    <div style=" display: block; flex: 1 1 auto;margin-left: 0;max-width: 100%;width: 100%;  padding: 0!important;">
                      <div style ="display: flex;flex-direction: column;padding: 0;width: 100%; border-bottom:1px dashed grey;">
                        <div style=" display: block; flex: 1 1 auto;margin-left: 0;max-width: 100%;width: 100%;">
                          <label style="display: block;align-items: baseline;font-size: 1rem; font-weight: 700;\
                          padding-top: 3px; padding-left: 6px;">Transaction Details</label>
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
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.status}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.consumerName}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.consumerNumber}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.mobileOrEmail}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.paymentMode}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.paymentChannel}</p>
                          <p style="font-weight: normal;font-size: 1em;">{formatDateTime(transactionDetails.billDate)}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.transactionID}</p>
                          <p style="font-weight: normal;font-size: 1em;">{getFormattedAmount(transactionDetails.billAmount)}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.customerConvenienceFee}</p>
                          <p style="font-weight: normal;font-size: 1em;">{getFormattedAmount(transactionDetails.totalAmount)}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.transactionDateTime}</p>
                          <p style="font-weight: normal;font-size: 1em;">{transactionDetails.bbpsReferenceNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <ModalFooter>
                  <div class="row">
                    <button type="button" onClick={this.printReceipts.bind(this)}>Print</button>
                    <div class="column no-padding">
                      <button class="float-right" type="button" onClick={this.toggleReceiptModal.bind(this)}>Close</button>
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
