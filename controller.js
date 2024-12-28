export class webController {
    #model
    constructor(model) {
        this.#model = model
    }

    login(key) {
        this.#model.initialize(key)
    }

    getViewWorkflows(count) {
        console.log(this.#model.workflows[0])
        return this.#model.workflows.slice(0, count)
    }

    update() {
        this.#model.update()
    }

}