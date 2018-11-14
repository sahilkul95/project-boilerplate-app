import { h, Component } from 'preact';

export default class Pagination extends Component {

  onPreviosPageClick() {
    this.props.onChangePageClick(Number(this.props.currentPageNo) - 1);
  }

  onNextPageClick() {
    this.props.onChangePageClick(Number(this.props.currentPageNo) + 1);
  }
  goToPage(e) {
    e.preventDefault();
    //T1473 : added textbox to jump on page provided by page no in textbox
    // if page no sent empty  and if page no provided is greater than total pages then be on current page
    // Developer: Samruddhi
    // Date: 11/7/2018
    if (e.target.pageNoText.value !== '' && Math.ceil(this.props.count/10) >= e.target.pageNoText.value) {
      // T1564 - Issues on text box near page number
      // Developer - Shrutika Khot
      // Date - 30/07/18
      // comment - e.target.pageNoText.value converted to number and removed unused componentWillMount function
      this.props.onChangePageClick(Number(e.target.pageNoText.value));
    }
    else
    {
      this.props.onChangePageClick(Math.ceil(this.props.count/10));
    }
  }

  render(props, {}) {
    if (!Number(props.count)) props.count = 1;
    return (
      <form onSubmit={this.goToPage.bind(this)}>
        <div>
          <span>
            <span>{props.currentPageNo} / {Math.ceil(props.count/10)}</span>
            <button class="button button-small" type="button" onClick={this.onPreviosPageClick.bind(this)} style="border-radius: 20px;"
              disabled={(props.currentPageNo && props.currentPageNo === 1) || (this.state.pageNoText === 1)}>{'<'}</button>
            <input type="number" class="no-spinners" name="pageNoText" style="width:40px; margin: 0 3px 0 3px;"
              min="1" value={props.currentPageNo} required/>
            <button class="button button-small" type="button" onClick={this.onNextPageClick.bind(this)} style="border-radius: 20px;"
              disabled={(props.currentPageNo === (Math.ceil(props.count/10))) || (this.state.pageNoText === (Math.ceil(props.count/10)))}>{'>'}</button>
          </span>
        </div>
      </form>
    );
  }
}
