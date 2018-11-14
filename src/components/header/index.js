import { h, Component } from 'preact';
import { Link } from 'preact-router';
import CONSTANTS from '../../lib/constants';
import { AppStore } from '../../lib/store';
import http from 'fetch-bb';
import { route } from 'preact-router';
import { Toast } from '../../lib/toastr';
import { startLoader, stopLoader } from '../../lib/utils';

export default class Header extends Component {

  componentDidMount() {
    return http.get(`${CONSTANTS.API_URL}/api/user/me`)
      .then((userinfo) => {
        if (!userinfo.isVerified) {
          this.logout();
        }
        AppStore.set('userinfo', userinfo);
        this.setState({
          brand: userinfo.company.brand,
          username: userinfo.name,
          userDisplayName: userinfo.displayName,
          email: userinfo.email,
          isClientAdmin: userinfo.isClientAdmin,
          shortName: userinfo.company.shortName,
          companyName: userinfo.company.name,
          isConsumerVerificationStage: userinfo.company.isConsumerVerificationStage
        });
        if (userinfo.department && userinfo.department.length) {
          this.setState({
            departmentName: userinfo.department[0].name
          });
        }
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  toggleMenu() {
    this.setState({
      navMenu: !this.state.navMenu
    });
  }

  logout() {
    startLoader();
    http.post(`${CONSTANTS.API_URL}/api/user/logout`)
      .then(() => {
        AppStore.removeAll();
        stopLoader();
        location.replace(location.origin);
        new Toast('Successfully logged out', Toast.TYPE_DONE, Toast.TIME_LONG);
        route(`/`);
      })
      .catch((HTTPException) => {
        stopLoader();
        console.error(HTTPException);
      });
  }

  openSidebar() {
    let navToggle = document.querySelector('.nav-toggle');
    let navClose= document.querySelector('.nav-close');
    navToggle.classList.toggle('expanded');
    navClose.classList.toggle('expanded');
    if (navToggle.classList.contains('expanded')) {
      document.getElementById("overlay").style.display = "block";
    } else {
      document.getElementById("overlay").style.display = "none";
    }
  }

  menuClick(link) {
    this.openSidebar();
    this.setState({
      route: link
    });
    route('/'+link);
  }

  componentWillMount() {
    this.state = {
      brand: '',
      username: '',
      userDisplayName: '',
      email:'',
      isClientAdmin: false,
      departmentName: '',
      shortName: '',
      isConsumerVerificationStage: false,
      route: 'dashboard'
    };

  }

  render({}, { userDisplayName }) {
    return (
      <div>
        <nav class="header">
          <div class="nav-toggle" onClick={this.openSidebar.bind(this)} style="width:20px; height:20px;">
            <div class="nav-toggle-bar"/>
          </div>
          <nav class="nav nav-close">
            <p style="padding: 0.8rem 5px 0px 4.5rem;font-size: 1.3rem;">
              <span onClick={this.menuClick.bind(this,'profile')}>{userDisplayName}</span>
              <em class="icon icon-ios-contact initial is-small" style="font-size: 28px; float: right; height: 35px;"/></p>
            <hr style="margin-bottom: 0; margin-top: 0.7rem;"/>
            <ul class="main-ul">
              <li onClick={this.menuClick.bind(this,'dashboard')} class={this.state.route === 'dashboard' ? 'nav-active' : ''}>Home</li>
              <li onClick={this.menuClick.bind(this,'consumers')} class={this.state.route === 'consumers' ? 'nav-active' : ''}>Consumers</li>
              <li>Requests</li>
              <ul class="sub-menu-ul">
                <li onClick={this.menuClick.bind(this,'tasks/all/underreview')} style="font-size: 1.15rem; line-height: 1.8rem;"
                  class={this.state.route === 'tasks/all/underreview' ? 'nav-active' : ''}>Review</li>
                <li onClick={this.menuClick.bind(this,'tasks/all/rejected')} style="font-size: 1.15rem; line-height: 1.8rem;"
                  class={this.state.route === 'tasks/all/rejected' ? 'nav-active' : ''}>Rejected</li>
                <li onClick={this.menuClick.bind(this,'tasks/billForm/accepted')} style="font-size: 1.15rem; line-height: 1.8rem;"
                  class={this.state.route === 'tasks/billForm/accepted' ? 'nav-active' : ''}>Vouchers</li>
              </ul>
              <li onClick={this.logout.bind(this)}>Logout</li>
            </ul>
          </nav>


          <div class={"menu " + ( this.state.navMenu ? 'active' : '')}>
            <div style="float:right">
              <Link href="/dashboard" class="no-padding billwise-logo" style="width: auto;">
                <img class="billwise-logo" src="/assets/static/PowerDECK Logo_white.svg" height="30" width="130"/>
              </Link>
            </div>
            {
              // <div clas="menucompname" style="display:inline;">
              //   <span>
              //     <input type="checkbox" id="drawer-toggle" name="drawer-toggle"/>
              //     <label for="drawer-toggle" id="drawer-toggle-label"/>
              //   </span>
              //   <nav id="drawer">
              //     <ul>
              //       <li><a href="#">Menu Item</a></li>
              //       <li><a href="#">Menu Item</a></li>
              //       <li><a href="#">Menu Item</a></li>
              //       <li><a href="#">Menu Item</a></li>
              //     </ul>
              //   </nav>
              // </div>

            }
            {
              // <div class="usermenu">
              //   <Link class="dropdown" href="#">
              //     <span class="username-wrap" title={userDisplayName} style="margin-left: 20px; display: inline;">
              //       <em class="icon icon-ios-contact initial is-small" style="position: absolute; top: 3px; left: 15px;"/>
              //       {userDisplayName}</span>
              //     <div class="dropdown-content" >
              //       <Link href="/profile">Profile</Link>
              //       <Link href="/verifyOldPassword">Change Password</Link>
              //       <a onClick={this.logout.bind(this)}>Logout</a>
              //     </div>
              //   </Link>
              //
              // </div>
            }


          </div>
        </nav>
      </div>
    );
  }
}
