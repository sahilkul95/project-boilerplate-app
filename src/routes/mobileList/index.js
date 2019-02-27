import { h, Component } from 'preact';

export default class MobileList extends Component {

  getResolution(e) {
    e.preventDefault();
    alert("Your screen resolution is: " + window.screen.width + "x" + window.screen.height);
  }

  componentWillMount(){
    this.setState({
      screenWidth: window.screen.width,
      isMobileView: false,
      consumerList: [
        {
          name: 'abc one',
          displayName: 'dispalay Name',
          village: 'village Name'
        },
        {
          name: 'abc two',
          displayName: 'dispalay Name',
          village: 'village Name'
        },
        {
          name: 'abc three',
          displayName: 'dispalay Name',
          village: 'village Name'
        },
        {
          name: 'abc four',
          displayName: 'dispalay Name',
          village: 'village Name'
        },
        {
          name: 'abc five',
          displayName: 'dispalay Name',
          village: 'village Name'
        }
      ]
    });
    if (this.state.screenWidth >= 1023) {
      this.setState({isMobileView: false});
    } else {
      this.setState({isMobileView: true});
    }
  }


  render ({}, state) {
    console.log(this.state.isMobileView,'!!!!!!!', state.screenWidth);
    return (
      <div>
        <section>
          <button type="button" onclick={this.getResolution.bind(this)}>Get Resolution</button>
          {
            state.isMobileView && (
              <div  class="visibilityForMobile">
                <h6>List View with cards</h6>
                <div class="row">
                  {
                    (state.consumerList.map((row) => (
                      <div class="col-xs-12 col-sm-12 col-md-6 col-lg-6">
                        <div class="box slide-wrapper-event slide-wrapper no-border-table" style=" border-radius:5px;">
                          <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin:0;">
                            <table class="no-border-table">
                              <tbody>
                                <tr><td>{row.name}</td> <td>{row.displayName}</td></tr>
                              </tbody>
                            </table>
                          </p>
                          <span class="slide">
                            <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 has-text-left" style="float:right; height: 100%;">
                              <div class="row middle-xs center-xs" style="height: 100%;">
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important; cursor:pointer; border-radius:5px;">
                                    <span>
                                      <em style="font-size: 1.2rem;color:limegreen;" class="icon-check-square"/>
                                    </span>
                                  </div>
                                </div>
                                <div class="has-text-left">
                                  <div class="box" style="height: 30px; text-align: center; margin: 4px !important; padding: 5px !important; cursor:pointer;  border-radius:5px;">
                                    <span>
                                      <em style="font-size: 1.2rem;color:limegreen;" class="icon-check-square"/>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </span>
                        </div>
                      </div>
                    )))
                  }
                </div>
              </div>
            )
          }

          <div  class="visibilityForDesktop">
            <h6>List View in table</h6>
            <div class="row">
              <div class="col-xs-12">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Display Name</th>
                      <th>Village</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      (
                        state.consumerList.map((row) => (
                          <tr>
                            <td>{row.name}</td>
                            <td>{row.displayName}</td>
                            <td>{row.village}</td>
                            <td><button type="button">edit</button></td>
                          </tr>
                        ))
                      )
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

      </div>
    );
  }
}
