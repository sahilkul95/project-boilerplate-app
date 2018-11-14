import {Component} from 'preact';

export default class Marker extends Component {

  componentWillMount() {
    this.state = {
      isIconClicked: false,
      isInfoModal: false,
      budgetCategoryList: this.props.markerContent.budgetCategoryList
    };
  }

  getBudgetCategoryNameUsingId(budgetCategoryID) {
    let budgetCategory = this.state.budgetCategoryList.filter( (elem) => {
      if (elem._id === budgetCategoryID) return elem;
    })[0];
    return budgetCategory ? ( budgetCategory.code ? budgetCategory.code + ' - ' + budgetCategory.displayName  : budgetCategory.displayName ) : '-';
  }

  openInfoPopup() {
    this.setState({isIconClicked: !this.state.isIconClicked, isInfoModal: !this.state.isInfoModal});
  }

  render(props, state) {
    return (
      <div style={{
        color: 'black',
        padding: '15px 10px',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translate(-50%, -50%)'
      }}>
        <div>
          {
            state.isInfoModal &&
            <div class="tooltiptext">
              Consumer Number: {props.markerContent.consumer.consumerNumber} <br />
              BU: {props.markerContent.consumer.discomDivisionNumber} <br />
              Budget Category: {this.getBudgetCategoryNameUsingId(props.markerContent.consumer.budgetCategoryID)}
            </div>
          }
          <img alt={props.altText} className={state.isIconClicked ? 'marker-enlarged' : 'marker-reduced'}
            src="../assets/static/meter.svg" onClick={this.openInfoPopup.bind(this)}/>
        </div>
      </div>
    );
  }
}
