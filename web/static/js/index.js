// Phoenix' dependencies
import '../../../deps/phoenix/priv/static/phoenix'
import '../../../deps/phoenix_html/priv/static/phoenix_html'

// Shiny new, hot React component
import React, { Component } from 'react'
import { render } from 'react-dom'

class Root extends Component {
  render () {
    return <h1>omg so hot</h1>
  }
}

render(<Root />, document.getElementById('root'))
