import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { dom, library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'

library.add(fas)

dom.watch() // To avoid using <font-awesome-icon> component. Using <i> will work.

export default FontAwesomeIcon
