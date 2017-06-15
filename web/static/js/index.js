import { Socket } from "phoenix"
import React from 'react'
import { render, findDOMNode } from 'react-dom'
import {
  browserHistory, Router, Route, IndexRoute, Link, withRouter
} from 'react-router'

const API = '/api/entries'

let _entries = {}
let _initCalled = false
let _changeListeners = []

const EntryStore = {
  init: function () {
    if (_initCalled)
      return

    _initCalled = true

    getJSON(API, function (err, res) {
      res.forEach(function (item) {
        if(item.id) {
          _entries[item.id] = item
        }
      })

      EntryStore.notifyChange()
    })
  },

  getEntries: function () {
    const array = []

    for (const id in _entries)
      array.push(_entries[id])

    return array
  },

  getEntry: function(id) {
    return _entries[id];
  },

  addNewEntry: function(item) {
    _entries[item.id] = item
  },

  notifyChange: function () {
    _changeListeners.forEach(function (listener) {
      listener()
    })
  },

  addChangeListener: function (listener) {
    _changeListeners.push(listener)
  },

  removeChangeListener: function (listener) {
    _changeListeners = _changeListeners.filter(function (l) {
      return listener !== l
    })
  },

  clearAll: function () {
    deleteJSON(API, function() {
      _entries = {}

      EntryStore.notifyChange()
    })
  }
}

function getJSON(url, cb) {
  const req = new XMLHttpRequest()
  req.onload = function () {
    if (req.status === 404) {
      cb(new Error('not found'))
    } else {
      cb(null, JSON.parse(req.response))
    }
  }
  req.open('GET', url)
  req.send()
}

function postJSON(url, obj, cb) {
  const req = new XMLHttpRequest()
  req.onload = function () {
    cb(JSON.parse(req.response))
  }
  req.open('POST', url)
  req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
  req.setRequestHeader('authorization', localStorage.token)
  req.send(JSON.stringify(obj))
}

function deleteJSON(url, cb) {
  const req = new XMLHttpRequest()
  req.onload = cb
  req.open('DELETE', url)
  req.setRequestHeader('authorization', localStorage.token)
  req.send()
}

const App = React.createClass({
  getInitialState() {
    return {
      entries: {}
    }
  },

  componentWillMount() {
    EntryStore.init()
  },

  componentDidMount() {
    EntryStore.addChangeListener(this.updateEntries)
  },

  componentWillUnmount() {
    EntryStore.removeChangeListener(this.updateEntries)
  },

  updateEntries() {
    this.setState({
      entries: EntryStore.getEntries(),
      loading: false
    })
  },

  componentDidMount() {
    this.serverRequest = getJSON(API, function (err, result) {
      result.forEach(function (item) {
        if(item.id) {
          _entries[item.id] = item
        }
      })
      this.setState({
        entries: _entries
      });
    }.bind(this));
    this.subscribeToNewEntries()
  },

  subscribeToNewEntries() {
    let socket = new Socket("/ws")
    socket.connect()
    let channel = socket.channel("entries:new", {})
    channel.join().receive("ok", chan => {
      console.log("joined")
    })
    channel.on("new:entry", entry => {
      this.addNewEntry(entry)
    })
  },
  addNewEntry(entry) {
    let entries = this.state.entries
    entries[entry.id] = entry
    EntryStore.addNewEntry(entry)
    this.setState({
      entries: entries
    })
  },

  clearHandler() {
    EntryStore.clearAll();
    this.updateEntries();
  },

  render() {
    const entries = this.state.entries || {}

    const rows = Object.keys(entries || {}).map(function(key) {
      var item = entries[key]
      return (
        <tr key={item.id}>
          <td className="entry">
            <Link activeClassName="active" to={`/entries/${item.id}`}>
              {item.request.method} <em>{item.request.request_path}</em>
            </Link>
          </td>
          <td className="entry">
              {item.response.status_code}
          </td>
        </tr>
      )
    })

    return (
      <div className="row">
        <div className="col-md-4">
          <h2>All Requests</h2>

          <button onClick={()=>this.clearHandler()}>clear</button>

          <table className="table table-hover">
            <tbody>
              {rows}
            </tbody>
          </table>
        </div>
        <div className="col-md-8">
          {this.props.children}
        </div>
      </div>
    )
  }
})

const Index = React.createClass({
  render() {
    return <h1>HTTP LOG</h1>
  }
})

const Entry = withRouter(
  React.createClass({

    getStateFromStore(props) {
      const { id } = props ? props.params : this.props.params

      console.log(id)
      console.log(EntryStore.getEntry(id))

      return {
        entry: EntryStore.getEntry(id)
      }
    },

    getInitialState() {
      return this.getStateFromStore()
    },

    componentDidMount() {
      EntryStore.addChangeListener(this.updateEntry)
    },

    componentWillUnmount() {
      EntryStore.removeChangeListener(this.updateEntry)
    },

    componentWillReceiveProps(nextProps) {
      this.setState(this.getStateFromStore(nextProps))
    },

    updateEntry() {
      this.setState(this.getStateFromStore())
    },

    render() {
      const entry = this.state.entry || {}

      return (
        <div className="entry-detail">
          <div className="row">
            <div className="col-md-4">{entry.response.headers["Date"]}</div>
            <div className="col-md-4">Response Time</div>
            <div className="col-md-4">{entry.request.headers["x-forwarded-for"]}</div>
          </div>
          <Request request={entry.request}/>
          <Response response={entry.response}/>
        </div>
      )
    }
  })
)

const Pane = React.createClass({
    render() {
      return (
        <div className={this.props.active ? "block": "hide"}>
          {this.props.children}
        </div>
      )
    }
});

const KeyVal = React.createClass({
    render() {
        const attrs = this.props.attrs || {}
        var rows = Object.keys(attrs || {}).map(function(key) {
            var value = attrs[key]
            var noValue = <small className="test-small text-muted">no value</small>
            return (
              <tr>
                <th>{key}</th>
                <td>{(!!value) ? value : noValue}</td>
              </tr>
            );
        });

        return (
          <div>
            <h6>{this.props.title}</h6>
            <table className="table params">
              <tbody>
                {rows}
              </tbody>
            </table>
          </div>
        );
    }
});

const Tabs = React.createClass({
    getInitialState() {
        return {"selected": this.props.children[0].props.name}
    },
    render() {
        const $tabs = this;
        const tabs = React.Children.map(this.props.children, function(child) {
            var selected = $tabs.state.selected == child.props.name;
            var onSelect = function() { $tabs.setState({selected:child.props.name}) }
            return (
              <li className={selected ? "active":""}>
                <a href="#" onClick={onSelect}>{child.props.name}</a>
              </li>
            );
        });
        const panes = React.Children.map(this.props.children, function(child) {
            var active = child.props.name == $tabs.state.selected;
            return (
              <Pane name={child.props.name} active={active}>
                {child.props.children}
              </Pane>
            )
        });
        return (
          <div>
            <ul className="nav nav-tabs">
              {tabs}
            </ul>
            {panes}
          </div>
        );
    }
});

const Request = React.createClass({
  render() {
    var req = this.props.request || {};
    return (
      <div>
        <h3 className="wrapped">
          {req.method} {req.request_path}
        </h3>
        <Tabs>
          <Pane name="Summary">
            <KeyVal title="Query Params" attrs={req.params}/>
            {req.body}
          </Pane>
          <Pane name="Headers">
            <KeyVal title="Headers" attrs={req.headers}/>
          </Pane>
          <Pane name="Raw">
            {req.body}
          </Pane>
        </Tabs>
      </div>
    );
  }
});

const Pretty = React.createClass({
  render() {
    const body = this.props.body
    var result;

    if(!!body) {
      const parsedBody = JSON.stringify(JSON.parse(body), null, 2)
      result = <pre> {parsedBody} </pre>
    }else {
      result = <div/>
    }

    return (
      result
    );
  }
})

const Response = React.createClass({
  render() {
    const resp = this.props.response || {};
    return (
      <div>
        <h3 className={resp.status}>{resp.status}</h3>
        <Tabs>
          <Pane name="Summary">
            <Pretty body={resp.body}/>
          </Pane>
          <Pane name="Headers">
            <div>
              <KeyVal title="Headers" attrs={resp.headers}/>
            </div>
          </Pane>
          <Pane name="Raw">
            <div className="http">
              {resp.body}
            </div>
          </Pane>
        </Tabs>
      </div>
    );
  }
});

const NotFound = React.createClass({
  render() {
    return <h2>Not found</h2>
  }
})

render((
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Index} />
      <Route path="entries/:id" component={Entry} />
      <Route path="*" component={NotFound} />
    </Route>
  </Router>
), document.getElementById('root'))
