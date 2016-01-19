require('./globals');
require('../styles/style.scss');

import Rx from 'rx';
import Cycle from '@cycle/core';
import {makeDOMDriver, hJSX} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';


let main = ({DOM}) => {

	const time$ = Rx.Observable.interval(1000).startWith(100);
	DOM;

	return {
		DOM: time$.map(i => <p>
      time elapsed: {i} seconds
    </p>)
	};
};


const drivers = {
  DOM: makeDOMDriver('#content'),
	HTTP: makeHTTPDriver()
};

Cycle.run(main, drivers);