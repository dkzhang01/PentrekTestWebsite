import {webModel} from "./model.js";
import {webView} from "./view.js";


let model = new webModel();
let view = new webView(model);
view.render_login(document.getElementById('main'));