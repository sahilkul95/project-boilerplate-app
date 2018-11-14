import { h, Component } from 'preact';
import { AppStore } from '../../lib/store';

export default class Footer extends Component {

  componentWillMount() {
    this.state = {
      companyName: ''
    };
    if (AppStore.get('userinfo').company) {
      this.setState({companyName: AppStore.get('userinfo').company.name});
    }
  }

  render({}, {companyName}) {
    return (
      <div>
        <section class="body-footer">
          <span>Powered By <span> Selenite </span></span>
          <span style="float:left"> <span>{companyName}</span></span>
        </section>
      </div>
    );
  }
}
