import { h, Component } from 'preact';

export default class MobileList extends Component {
  render ({}, {}) {
    return (
      <div>
        <section>
          <h6>List View with cards</h6>
          <div class="row">
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">
              <div class="box slide-wrapper-event slide-wrapper no-border-table" style=" border-radius:5px;">
                <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin:0;">
                  <table class="no-border-table">
                    <tbody>
                      <tr><td>name</td> <td>display name</td></tr>
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
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">
              <div class="box slide-wrapper-event slide-wrapper no-border-table" style=" border-radius:5px;">
                <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin:0;">
                  <table class="no-border-table">
                    <tbody>
                      <tr><td>name</td> <td>display name</td></tr>
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
            <div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">
              <div class="box slide-wrapper-event slide-wrapper no-border-table" style=" border-radius:5px;">
                <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin:0;">
                  <table class="no-border-table">
                    <tbody>
                      <tr><td>name</td> <td>display name</td></tr>
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
          </div>
          <h6>List View in table</h6>
        </section>

      </div>
    );
  }
}
