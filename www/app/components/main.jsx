var React = require('react');
var Link = require('react-router').Link;
var mixins = require('baobab-react/mixins');
var cookie = require('cookie-cutter');
var Modal = require('react-bootstrap/lib/Modal');
var PureRenderMixin = require('react-addons-pure-render-mixin');

var actions = require('../actions');
var Nav = require('./helpers/nav');
var Alerts = require('./helpers/alerts');

module.exports = React.createClass({
  displayName: 'Main',
  mixins: [
    mixins.root,
    PureRenderMixin,
  ],
  props: {
    location: React.PropTypes.object.isRequired,
  },

  getInitialState: function() {
    return {
      disclaimer: false,
    };
  },

  componentWillMount: function() {
    actions.login().then(function(auth) {
      if (auth.loggedin) {
        actions.getUserLists();
      }
    });

    var show = cookie.get('disclaimer');
    if (!show) {
      this.open('disclaimer');

      var now = new Date();
      cookie.set('disclaimer', Math.floor(now.getTime() / 1000), {expires: 365});
    }
  },

  open: function(modal) {
    if (modal == 'faq') {
      actions.openModal('faq');
    }
    else {
      this.setState({disclaimer: true});
    }
  },

  close: function() {
    this.setState({disclaimer: false});
  },

  renderDisclaimer: function() {
    return (
      <Modal show={this.state.disclaimer} onHide={this.close}>
        <Modal.Header closeButton>
          <Modal.Title>Welcome to uApp Explorer!</Modal.Title>
        </Modal.Header>

        <Modal.Body>
This site is an unofficial app browser for Ubuntu Touch apps. All data for the
apps comes from a publicly accessible api. This site is maintained by Brian
Douglass and is not endorsed by or affiliated with Ubuntu or Canonical. Ubuntu
and Canonical are registered trademarks of Canonical Ltd.
        </Modal.Body>

        <Modal.Footer>
          <button className="btn btn-info" onClick={this.close.bind(this, 'disclaimer')}>Close</button>
        </Modal.Footer>
      </Modal>
    );
  },

  render: function() {


    return (
      <div>
        <Nav location={this.props.location} />

        <div className="container">
          <Alerts />
        </div>

        <div className="container main">
          <div className="row">
            <div className="col-sm-12 text-center disclaimer">
              <a onClick={this.open.bind(this, 'faq')} className="clickable">This is an unofficial app viewer for Ubuntu Touch apps.</a>
            </div>
          </div>

          {this.props.children}

          <div className="row text-center footer">
            <div className="col-sm-4">
              <Link to="/app/uappexplorer.bhdouglass">
                <i className="fa fa-fw fa-mobile"></i> <span>Web App</span>
              </Link>

              <Link to="/app/uappexplorer-scope.bhdouglass">
                <i className="fa fa-fw fa-mobile"></i> <span>Scope</span>
              </Link>

              <Link to="/app/uappexplorer-donate.bhdouglass" className="hidden-xs">
                <i className="fa fa-fw fa-mobile"></i> <span>Donation Web App</span>
              </Link>
            </div>

            <div className="col-sm-4">
              <a href="https://twitter.com/uappexplorer" style={{display: 'inline-block !important'}}><i className="fa fa-fw fa-t"></i> Twitter</a>
              <a href="https://plus.google.com/+Uappexplorer-ubuntu" style={{display: 'inline-block !important'}}><i className="fa fa-fw fa-gp"></i> Google+</a>
            </div>
            <div className="col-sm-4">
              <a href="http://feeds.feedburner.com/UbuntuTouchNewApps">
                <i className="fa fa-fw fa-rss-square"></i> <span>New Apps</span>
              </a>
              <a href="http://feeds.feedburner.com/uAppExplorerUpdatedApps">
                <i className="fa fa-fw fa-rss-square"></i> <span>Updated Apps</span>
              </a>
            </div>
          </div>
        </div>

        {this.renderDisclaimer()}
      </div>
    );
  }
});
