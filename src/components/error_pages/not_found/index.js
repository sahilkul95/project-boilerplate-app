import { h, Component } from 'preact';

export default class NotFound extends Component {
  render(props) {
    return (
      <div>
        <div>
          <h1> {props.type} Error </h1>
        </div>
        <div>
          Page Not Found
        </div>
      </div>
    );
  }
}
