require('./globals');

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

let x = 2;

if(x) { 5; } else { 4; }


const drivers = {
  DOM: makeDOMDriver('#content'),
	HTTP: makeHTTPDriver()
};

Cycle.run(main, drivers);