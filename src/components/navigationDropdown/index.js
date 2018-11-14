import { h, Component } from 'preact';
import { route } from 'preact-router';
import { AppStore } from '../../lib/store';

export default class NavigationDropdown extends Component {

  navigateToPage(e) {
    if (!e.target.value) {
      return;
    }
    route(e.target.value);
  }

  componentWillMount() {
    this.state = {
      isClientAdmin: {}
    };
    const userInfo = AppStore.get('userinfo');
    this.setState({isClientAdmin: userInfo.isClientAdmin});
  }

  render({}, { isClientAdmin }) {
    return (
      <div class="column has-text-right">
        <span class="select" style="width:auto!important">
          <select style="width:auto;" onChange={this.navigateToPage.bind(this)} value="">
            <option value="">Navigate To</option>
            <option value="/">Dashboard</option>
            {/*<option value="/oldDashboard">New Dashboard</option>*/}
            <option value="/consumerVerificationList">Consumer Verification List</option>
            <option value="/consumers">My Consumers</option>
            <option value="/bills/reviewpending/days">My Bills</option>
            {/*<option value="/oldBills/reviewpending/days">New Bills</option>*/}
            {
              !isClientAdmin &&
              <option value="/billforms">My Billforms</option>
            }
            {
              !isClientAdmin &&
              <option value="/paymentVouchers">My Payment Vouchers</option>
            }
            {
              isClientAdmin &&
              <option value="/settings">My Organization</option>
            }
          </select>
        </span>
      </div>
    );
  }
}
