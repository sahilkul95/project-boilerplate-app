import { h, Component } from 'preact';
// import { Link } from 'preact-router';

export default class VerticalNavigation extends Component {

  // hoverOn (){
  //   this.setState({ hover: true });
  // }
  // hoverOff (){
  //   this.setState({ hover: false });
  // }
  componentWillMount() {
    this.setState({
      hover: false
    });
  }

  render({}) {
    return (<div id="mySidenav" class="sidenav sidenav-width">
      {
        // <div id="nav--super-vertical" className={"no-margin-vertical " + ((state.hover) ? 'nav--super-vertical' : 'nav--super-vertical-60')}
        //   onMouseEnter={this.hoverOn.bind(this)} onMouseLeave={this.hoverOff.bind(this)}>
        //   <nav id="myVerticalSidenav" className={"gn-menu-wrapper " + ((state.hover) ? 'gn-open-all' : 'gn-open-part')}>
      }
      <div id="nav--super-vertical" class="no-margin-vertical nav--super-vertical-60">
        <nav id="myVerticalSidenav" class="gn-menu-wrapper gn-open-part">
          <div class="gn-scroller">
            <ul class="gn-menu" style="list-style:none; margin:0;">
              <li class="gn-search-item">
                <a><em class="icon icon-search" style="padding: 0 16px 0 10px; font-size: 1.5rem;"/>
                  <input placeholder="Search" class="gn-search" type="search"/></a>
              </li>
              <li>
                <a href="/dashboard"> <em class="icon icon-ios-contact" style="padding: 0 35px 0 10px; font-size: 1.5rem;"/>Home</a>
              </li>
              <li>
                <a href="/mobileListView"> <em class="icon icon-ios-contact" style="padding: 0 35px 0 10px; font-size: 1.5rem;"/>List View</a>
              </li>
              <li>
                <a> <em class="icon icon-ios-contact" style="padding: 0 35px 0 10px; font-size: 1.5rem;"/>Downloads</a>
                <ul class="gn-submenu" style="list-style:none;">
                  <li><a class="gn-icon gn-icon-illustrator">Vector Illustrations</a></li>
                  <li><a class="gn-icon gn-icon-photoshop">Photoshop files</a></li>
                </ul>
              </li>
            </ul>
            <div class="nav-collapsible">
              <div>
                <div class="col-xs-12 col-sm-12 col-lg-12 no-pad">
                  <input type="checkbox" id="nav-collapsible-2" />
                  <label for="nav-collapsible-2" style="display:flex; border-bottom:none;">
                    <div class="row">
                      <div class="col-xs-12" >
                        <em class="icon icon-ios-contact" style="padding: 0 35px 0 10px; font-size: 1.5rem;"/>Setting
                      </div>
                    </div>
                  </label>
                  <div class="nav-collapsible-links">
                    <a href="#">Change Password</a>
                    <a href="#">Logout</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>);
  }
}
