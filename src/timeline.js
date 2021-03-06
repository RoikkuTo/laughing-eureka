import TimeProvider from './TimeProvider.js'
import Task from './Task.js'
import Keytime from './Keytime.js'
import Chain from './Chain.js'
import Util from './Util.js'
import Timestamp from './Timestamp.js'

export default class Timeline {
	constructor(opts = {}) {
		const { id, ratio, task/* , range */ } = opts
		this.id = (id => {
			if (id) {
				if (TimeProvider.checkId(id)) return id
				else {
					console.error(`ERROR: The "${id}" id has already been defined. (Timeline Library)`)
					return Date.now()
				}
			} else return Date.now()
		})(id)
		this.ratio = ratio || 1
		this.task = task ? new Task(task) : null
		this.keytime = new Keytime()

		this.chain = new Chain(this)
		this.util = new Util(this)

		this.bank = 0
		this.initial = 0
		this.current = 0
		this.state = 'stop'

		TimeProvider.subscribe(this.consume.bind(this))
	}

	consume(timestamp) {
		this.controller(timestamp)

		const ts = new Timestamp({
			currentTime: this.current,
			globalTime: timestamp
		})
		this.util.compare(ts)
		this.keytime.compare(ts)
	}

	setId(id) {
		if (id) {
			if (TimeProvider.checkId(id)) this.id = id
			else console.error(`ERROR: The "${id}" id has already been defined. (Timeline Library)`)
		} else console.error(`ERROR: Please specify an id. (Timeline Library)`)
	}

	setRatio(ratio) {
		this.ratio = ratio
	}

	setTask(task) {
		this.task = new Task(task)
	}

	addKeytime(key) {
		this.keytime.add(key)
	}

	removeKeytime(id) {
		this.keytime.remove(id)
	}

	listKeytimes() {
		return this.keytime.list
	}

	controller(timestamp) {
		if (!this.initial) this.initial = timestamp

		switch (this.state) {
			case 'start':
				if (this.bank) {
					this.initial += this.bank
					this.bank = null
				}
				this.current = (timestamp - this.initial) * this.ratio
				this.task && this.task.run(new Timestamp({
					currentTime: this.current,
					globalTime: timestamp
				}))
				break

			case 'stop':
				this.bank = (timestamp - this.initial - this.current) * this.ratio
				break

			case 'reset':
				this.state = 'stop'
				this.initial = 0
				this.current = 0
				break

			default:
				console.error('Undefined state.')
				break
		}
	}

	request(name, delay = 0, cb) {
		const req = (resolve, reject) => {
			this.util.key = {
				delay,
				callback: timestamp => {
					this.state = name
					resolve()
				}
			}
		}
		return this.chain.add(req.bind(this), cb)
	}

	start(delay, cb) {
		return this.request('start', delay, cb)
	}

	stop(delay, cb) {
		return this.request('stop', delay, cb)
	}

	reset(delay, cb) {
		return this.request('reset', delay, cb)
	}

	delete() {
		TimeProvider.unsubscribe(this.id)
	}
}
