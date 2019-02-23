import { h, Component } from 'preact';

export default class Dashboard extends Component {
  render ({}, {}) {
    return (
      <div>
        <section>
          <h6>Dashboard</h6>
          <div class="row">
            <div class="col-xs-12 table-responsive">
              <table>
                <thead>
                  <tr>
                    <td>head one</td>
                    <td>head one</td>
                    <td>head one column 3</td>
                    <td>head four column four</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>head one</td>
                    <td>head one</td>
                    <td>head one column 3</td>
                    <td>head four column four</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="">
            <h2>Responsive layout</h2>

            <h3>Responsive layout</h3>
            <div class="row">
              <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                <div class="box">Box 1</div>
              </div>
              <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                <div class="box">Box 2</div>
              </div>
              <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                <div class="box">Box 3</div>
              </div>
            </div>

            <h3>Box offset</h3>
            <div class="row">
              <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4 col-lg-offset-3">
                <div class="box">Box with offset</div>
              </div>
            </div>

            <h3>Auto Width</h3>
            <div class="row">
              <div class="col-xs">
                <div class="box">Box auto width</div>
              </div>
              <div class="col-xs">
                <div class="box">Box auto width</div>
              </div>
              <div class="col-xs">
                <div class="box">Box auto width</div>
              </div>
              <div class="col-xs">
                <div class="box">Box auto width</div>
              </div>
              <div class="col-xs">
                <div class="box">Box auto width</div>
              </div>
            </div>

            <h2>Typography</h2>
            <div class="box">
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <h1 class="title">
                      <span class="web-note">Header 1 </span>The life at my company </h1>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <h2 class="title">
                      <span class="web-note">Header 2 </span>The life at my company </h2>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <h3 class="title">
                      <span class="web-note">Header 3 </span>The life at my company </h3>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <h4 class="title">
                      <span class="web-note">Header 4 </span>The life at my company </h4>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <h5 class="title">
                      <span class="web-note">Header 5 </span>The life at my company </h5>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <h6 class="title">
                      <span class="web-note">Header 6 </span>The life at my company </h6>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <p><span class="web-note">Paragraph</span>
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers.
                         I understand culture. I am the nucleus. I think thats a responsibility that I have,
                         to push possibilities, to show people, this is the level that things could be at.</p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <span class="web-note">Muted Text</span>
                    <p class="text-muted">
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers...
                    </p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <span class="web-note">Primary Text</span>
                    <p class="text-primary">
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers...
                    </p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <span class="web-note">Info Text</span>
                    <p class="text-info">
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers...
                    </p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <span class="web-note">Success Text</span>
                    <p class="text-success">
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers...
                    </p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <span class="web-note">Warning Text</span>
                    <p class="text-warning">
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers...
                    </p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-xs-12">
                  <div class="web-typo">
                    <span class="web-note">Danger Text</span>
                    <p class="text-danger">
                        I will be the leader of a company that ends up being worth billions of dollars, because I got the answers...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-xs-12">
                <div class="box">
                  <div class="title">
                    <h3>Buttons</h3>
                    <br/>
                    <p>Pick your style</p>
                    <div class="row">
                      <div class="col-xs-12 col-sm-12 col-md-8 col-lg-8 col-lg-offset-2">
                        <button class="button">Default</button>
                        <button class=" button-round">Round</button>
                        <button class=" button is-small">Small</button>
                        <button class="button-fab">
                          <i class="material-icons">Fix</i>
                        </button>
                        <button class="button-clear">Clear</button>
                      </div>
                    </div>
                  </div>
                  <div class="title">
                    <p>
                        Pick your size
                    </p>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-sm-12 col-md-8 col-lg-8 col-lg-offset-2">
                      <button class="button is-small">Small</button>
                      <button class="button">Regular</button>
                      <button class="button is-large">Large</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-xs-12">
                <div class="box">
                  <div class="title">
                    <h3>Forms</h3>
                    <div class="row">
                      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                        <div class="field">
                          <label class="label">Name</label>
                          <p class="control">
                            <input class="input" placeholder="Text input" type="text"/>
                          </p>
                        </div>
                      </div>
                      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4 input-container">
                        <label>
                          <input type="text" placeholder="Text input" name="product_name"/>
                          <span>Text input</span>
                        </label>
                      </div>
                    </div>
                    <br/>
                    <div class="row">
                      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                        <div class="title">
                          <h6>Checkboxes</h6>
                        </div>
                        <div class="form-check">
                          <input type="checkbox" value=""/> Unchecked
                        </div>
                        <div class="form-check">
                          <input type="checkbox" value="" checked/> Checked
                        </div>
                        <div class="form-check">
                          <input type="checkbox" value="" disabled/> Disabled Unchecked
                        </div>
                        <div class="form-check">
                          <input type="checkbox" value="" disabled checked/> Disabled Checked
                        </div>
                      </div>
                      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                        <div class="title">
                          <h6>Radio Buttons</h6>
                        </div>
                        <div class="form-check">
                          <input type="radio" id="test1" name="exampleRadios" value="option1"/>
                          <label for="test1">Radio is off</label>
                        </div>
                        <div class="form-check">
                          <input type="radio" id="test2" name="exampleRadios" value="option2" checked/>
                          <label for="test2">Radio is on</label>
                        </div>
                        <div class="form-check disabled">
                          <input type="radio" id="test3" name="exampleRadios1" value="option1" disabled/>
                          <label for="test3">Disabled radio is off</label>
                        </div>
                        <div class="form-check disabled">
                          <input type="radio" id="test4" name="exampleRadio1" value="option2" checked disabled/>
                          <label for="test4">Disabled radio is on</label>
                        </div>
                      </div>
                      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
                        <div class="title">
                          <h6>Toggle Buttons</h6>
                        </div>
                        <div>
                          <label class="switch">
                            <input type="checkbox"/>
                            <span class="slider round"/>
                          </label>
                        </div>
                        <div>
                          <label class="switch">
                            <input type="checkbox" checked/>
                            <span class="slider round"/>
                          </label>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>




          </div>
        </section>

      </div>
    );
  }
}
