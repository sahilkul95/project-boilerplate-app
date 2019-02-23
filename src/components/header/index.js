import { h, Component } from 'preact';

export default class Header extends Component {

  openNav() {
    let sideNavDiv = Array.prototype.slice.call(document.querySelectorAll('.sidenav'), 0);
    if (sideNavDiv.length > 0) {
      document.getElementById("mySidenav").classList.toggle('sidenav-width');
      document.getElementById("mySidenav").classList.toggle('sidenav-hide');
      document.getElementById("nav--super-vertical").classList.toggle('nav--super-vertical');
      document.getElementById("nav--super-vertical").classList.toggle('nav--super-vertical-60');
      document.getElementById("main").classList.toggle('header-hide');
      document.getElementById("myVerticalSidenav").classList.toggle('gn-open-all');
      document.getElementById("myVerticalSidenav").classList.toggle('gn-open-part');
      // document.getElementById("main").classList.toggle('margin-left-300');
      // document.getElementById("burger-menu").classList.toggle('margin-right-200');
      document.getElementById("myOverlay").classList.toggle('overlay');
    }
    let contentDiv = Array.prototype.slice.call(document.querySelectorAll('.outer-most-div'), 0);
    if (contentDiv.length > 0) {
      let $target = document.getElementById('main-body');
      $target.classList.toggle('margin-left-300');
    }
  }

  componentWillMount() {
    document.addEventListener('DOMContentLoaded', () => {

      // Get all "navbar-burger" elements
      let $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

      // Check if there are any navbar burgers
      if ($navbarBurgers.length > 0) {

        // Add a click event on each of them
        $navbarBurgers.forEach(($el) => {
          $el.addEventListener('click', () => {

            // Get the target from the "data-target" attribute
            let target = $el.dataset.target;
            let $target = document.getElementById(target);

            // Toggle the class on both the "navbar-burger" and the "navbar-menu"
            $el.classList.toggle('is-active');
            $target.classList.toggle('is-active');

          });
        });
      }

    });
  }

  closeNav(){
    document.getElementById("myOverlay").classList.toggle('overlay');
    let $target = document.getElementById('mySidenav');
    $target.classList.toggle('sidenav-width');
    $target.classList.toggle('sidenav-hide');
    let $target1 = document.getElementById('myVerticalSidenav');
    let $target2 = document.getElementById('nav--super-vertical');
    if ($target1.classList.contains('gn-open-all')) {
      $target1.classList.add('gn-open-part');
      $target1.classList.remove('gn-open-all');
      document.getElementById("main-body").classList.add('margin-left-300');
    }
    document.getElementById("main-body").classList.remove('margin-left-300');
    if ($target2.classList.contains('nav--super-vertical')) {
      $target2.classList.add('nav--super-vertical-60');
      $target2.classList.remove('nav--super-vertical');
    }
  //   $target1.classList.toggle('gn-open-part');
  //   $target1.classList.toggle('gn-open-all');
    // let $target2 = document.getElementById('nav--super-vertical');
  //   $target2.classList.toggle('nav--super-vertical-60');
  //   $target2.classList.toggle('nav--super-vertical');
  }

  componentDidMount() {
  }

  render({}) {
    return (
      <div style="transition:0.3s">
        <div id="myOverlay" class="" onclick={this.closeNav.bind(this)}/>
        <div class="hero-head" >
          <nav class="navbar box" style="padding:0 !important;">
            <div class="container" id="main">

              <div class="navbar-brand">
                <span style="font-size:23px;cursor:pointer;padding: 13px 5px 0px 20px;"  onclick={this.openNav.bind(this)}>&#9776;</span>
                <a class="navbar-item" href="/">
                  <strong>company Name</strong>
                </a>
                <span class="navbar-burger" id="burger-menu" data-target="navbarMenuHero1" style="position: absolute; right: 20px; top: 20px;">
                  <em class="icon icon-search"/>
                </span>
              </div>
              <div id="navbarMenuHero1" class="navbar-menu">
                <div class="navbar-end"  style="margin-right:2em;">
                  <div class="searchcontainer navbar-item">
                    <input type="text" placeholder="Search..."/>
                  </div>

                  {
                    // <div class="navbar-item has-dropdown is-hoverable">
                    //   <div class="navbar-link">
                    //     nav subMenu
                    //   </div>
                    //   <div class="navbar-dropdown is-boxed">
                    //     <a class="navbar-item" href="/rejectedRequest/">
                    //       nav subMenu one
                    //     </a>
                    //     <a class="navbar-item" href="/reviewRequest/">
                    //       nav subMenu 2
                    //     </a>
                    //     <a class="navbar-item" href="/publishRequest">
                    //       nav subMenu three
                    //     </a>
                    //   </div>
                    // </div>
                  }


                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    );
  }
}
