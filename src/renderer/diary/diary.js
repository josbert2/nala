'use strict'

// Paths sacados de @hugeicons/core-free-icons (viewBox 24x24, stroke=currentColor).
const ICON_PATHS = {
  list: '<path d="M2 11.4C2 10.2417 2.24173 10 3.4 10H20.6C21.7583 10 22 10.2417 22 11.4V12.6C22 13.7583 21.7583 14 20.6 14H3.4C2.24173 14 2 13.7583 2 12.6V11.4Z" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M2 3.4C2 2.24173 2.24173 2 3.4 2H20.6C21.7583 2 22 2.24173 22 3.4V4.6C22 5.75827 21.7583 6 20.6 6H3.4C2.24173 6 2 5.75827 2 4.6V3.4Z" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M2 19.4C2 18.2417 2.24173 18 3.4 18H20.6C21.7583 18 22 18.2417 22 19.4V20.6C22 21.7583 21.7583 22 20.6 22H3.4C2.24173 22 2 21.7583 2 20.6V19.4Z" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>',
  kanban: '<path d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95491C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95491 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M12 7V11M17 7V17M7 7V14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  calendar: '<path d="M16 2V6M8 2V6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M3 10H21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  gantt: '<path d="M11 6H19M7 11H14M13 16H19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M3 3V13C3 16.7712 3 18.6569 4.17157 19.8284C5.34315 21 7.22876 21 11 21H21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  flag: '<path d="M4 7L4 21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M11.7576 3.90865C8.45236 2.22497 5.85125 3.21144 4.55426 4.2192C4.32048 4.40085 4.20358 4.49167 4.10179 4.69967C4 4.90767 4 5.10138 4 5.4888V14.7319C4.9697 13.6342 7.87879 11.9328 11.7576 13.9086C15.224 15.6744 18.1741 14.9424 19.5697 14.1795C19.7633 14.0737 19.8601 14.0207 19.9301 13.9028C20 13.7849 20 13.6569 20 13.4009V5.87389C20 5.04538 20 4.63113 19.8027 4.48106C19.6053 4.33099 19.1436 4.459 18.2202 4.71504C16.64 5.15319 14.3423 5.22532 11.7576 3.90865Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  plus: '<path d="M12 4V20M20 12H4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  close: '<path d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  folder: '<path d="M16.2627 10.5H7.73725C5.15571 10.5 3.86494 10.5 3.27143 11.3526C2.67793 12.2052 3.11904 13.4258 4.00126 15.867L5.08545 18.867C5.54545 20.1398 5.77545 20.7763 6.2889 21.1381C6.80235 21.5 7.47538 21.5 8.82143 21.5H15.1786C16.5246 21.5 17.1976 21.5 17.7111 21.1381C18.2245 20.7763 18.4545 20.1398 18.9146 18.867L19.9987 15.867C20.881 13.4258 21.3221 12.2052 20.7286 11.3526C20.1351 10.5 18.8443 10.5 16.2627 10.5Z" stroke="currentColor" stroke-linecap="square" stroke-width="1.5"/><path d="M19 8C19 7.53406 19 7.30109 18.9239 7.11732C18.8224 6.87229 18.6277 6.67761 18.3827 6.57612C18.1989 6.5 17.9659 6.5 17.5 6.5H6.5C6.03406 6.5 5.80109 6.5 5.61732 6.57612C5.37229 6.67761 5.17761 6.87229 5.07612 7.11732C5 7.30109 5 7.53406 5 8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M16.5 4C16.5 3.53406 16.5 3.30109 16.4239 3.11732C16.3224 2.87229 16.1277 2.67761 15.8827 2.57612C15.6989 2.5 15.4659 2.5 15 2.5H9C8.53406 2.5 8.30109 2.5 8.11732 2.57612C7.87229 2.67761 7.67761 2.87229 7.57612 3.11732C7.5 3.30109 7.5 3.53406 7.5 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  comment: '<path d="M8 13.5H16M8 8.5H12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M6.09881 19C4.7987 18.8721 3.82475 18.4816 3.17157 17.8284C2 16.6569 2 14.7712 2 11V10.5C2 6.72876 2 4.84315 3.17157 3.67157C4.34315 2.5 6.22876 2.5 10 2.5H14C17.7712 2.5 19.6569 2.5 20.8284 3.67157C22 4.84315 22 6.72876 22 10.5V11C22 14.7712 22 16.6569 20.8284 17.8284C19.6569 19 17.7712 19 14 19C13.4395 19.0125 12.9931 19.0551 12.5546 19.155C11.3562 19.4309 10.2465 20.0441 9.14987 20.5789C7.58729 21.3408 6.806 21.7218 6.31569 21.3651C5.37769 20.6665 6.29454 18.5019 6.5 17.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>',
  trash: '<path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M9.5 16.5L9.5 10.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M14.5 16.5L14.5 10.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>',
  sun: '<path d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 2V3.5M12 20.5V22M19.0708 19.0713L18.0101 18.0106M5.98926 5.98926L4.9286 4.9286M22 12H20.5M3.5 12H2M19.0713 4.92871L18.0106 5.98937M5.98975 18.0107L4.92909 19.0714" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>',
  moon: '<path d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91792 11.2509 8.91792 6.52485C8.91792 5.06986 9.28105 3.69968 9.92163 2.5C5.66765 3.49698 2.5 7.31513 2.5 11.8731C2.5 17.1899 6.8101 21.5 12.1269 21.5C16.6849 21.5 20.503 18.3324 21.5 14.0784Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  github: '<path d="M6.51734 17.1132C6.91177 17.6905 8.10883 18.9228 9.74168 19.2333M9.86428 22C8.83582 21.8306 2 19.6057 2 12.0926C2 5.06329 8.0019 2 12.0008 2C15.9996 2 22 5.06329 22 12.0926C22 19.6057 15.1642 21.8306 14.1357 22C14.1357 22 13.9267 18.5826 14.0487 17.9969C14.1706 17.4113 13.7552 16.4688 13.7552 16.4688C14.7262 16.1055 16.2043 15.5847 16.7001 14.1874C17.0848 13.1032 17.3268 11.5288 16.2508 10.0489C16.2508 10.0489 16.5318 7.65809 15.9996 7.56548C15.4675 7.47287 13.8998 8.51192 13.8998 8.51192C13.4432 8.38248 12.4243 8.13476 12.0018 8.17939C11.5792 8.13476 10.5568 8.38248 10.1002 8.51192C10.1002 8.51192 8.53249 7.47287 8.00036 7.56548C7.46823 7.65809 7.74917 10.0489 7.74917 10.0489C6.67316 11.5288 6.91516 13.1032 7.2999 14.1874C7.79575 15.5847 9.27384 16.1055 10.2448 16.4688C10.2448 16.4688 9.82944 17.4113 9.95135 17.9969C10.0733 18.5826 9.86428 22 9.86428 22Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  arrowLeft: '<path d="M5.5 12.002H19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M10.9999 18.002C10.9999 18.002 4.99998 13.583 4.99997 12.0019C4.99996 10.4208 11 6.00195 11 6.00195" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  arrowRight: '<path d="M18.5 12L4.99997 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M13 18C13 18 19 13.5811 19 12C19 10.4188 13 6 13 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  chevronDown: '<path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  checkCircle: '<path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="currentColor" stroke-width="1.5"/><path d="M8 12.5L10.5 15L16 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  settings: '<path d="M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z" stroke="currentColor" stroke-width="1.5"/><path d="M21.011 14.0965C21.5329 13.9558 21.7939 13.8854 21.8969 13.7508C22 13.6163 22 13.3998 22 12.9669V11.0332C22 10.6003 22 10.3838 21.8969 10.2493C21.7938 10.1147 21.5329 10.0443 21.011 9.90358C19.0606 9.37759 17.8399 7.33851 18.3433 5.40087C18.4817 4.86799 18.5509 4.60156 18.4848 4.44529C18.4187 4.28902 18.2291 4.18134 17.8497 3.96596L16.125 2.98673C15.7528 2.77539 15.5667 2.66972 15.3997 2.69222C15.2326 2.71472 15.0442 2.90273 14.6672 3.27873C13.208 4.73448 10.7936 4.73442 9.33434 3.27864C8.95743 2.90263 8.76898 2.71463 8.60193 2.69212C8.43489 2.66962 8.24877 2.77529 7.87653 2.98663L6.15184 3.96587C5.77253 4.18123 5.58287 4.28891 5.51678 4.44515C5.45068 4.6014 5.51987 4.86787 5.65825 5.4008C6.16137 7.3385 4.93972 9.37763 2.98902 9.9036C2.46712 10.0443 2.20617 10.1147 2.10308 10.2492C2 10.3838 2 10.6003 2 11.0332V12.9669C2 13.3998 2 13.6163 2.10308 13.7508C2.20615 13.8854 2.46711 13.9558 2.98902 14.0965C4.9394 14.6225 6.16008 16.6616 5.65672 18.5992C5.51829 19.1321 5.44907 19.3985 5.51516 19.5548C5.58126 19.7111 5.77092 19.8188 6.15025 20.0341L7.87495 21.0134C8.24721 21.2247 8.43334 21.3304 8.6004 21.3079C8.76746 21.2854 8.95588 21.0973 9.33271 20.7213C10.7927 19.2644 13.2088 19.2643 14.6689 20.7212C15.0457 21.0973 15.2341 21.2853 15.4012 21.3078C15.5682 21.3303 15.7544 21.2246 16.1266 21.0133L17.8513 20.034C18.2307 19.8187 18.4204 19.711 18.4864 19.5547C18.5525 19.3984 18.4833 19.132 18.3448 18.5991C17.8412 16.6616 19.0609 14.6226 21.011 14.0965Z" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>',
  layers: '<path d="M8.64298 3.14559L6.93816 3.93362C4.31272 5.14719 3 5.75397 3 6.75C3 7.74603 4.31272 8.35281 6.93817 9.56638L8.64298 10.3544C10.2952 11.1181 11.1214 11.5 12 11.5C12.8786 11.5 13.7048 11.1181 15.357 10.3544L17.0618 9.56638C19.6873 8.35281 21 7.74603 21 6.75C21 5.75397 19.6873 5.14719 17.0618 3.93362L15.357 3.14559C13.7048 2.38186 12.8786 2 12 2C11.1214 2 10.2952 2.38186 8.64298 3.14559Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M20.788 11.0972C20.9293 11.2959 21 11.5031 21 11.7309C21 12.7127 19.6873 13.3109 17.0618 14.5072L15.357 15.284C13.7048 16.0368 12.8786 16.4133 12 16.4133C11.1214 16.4133 10.2952 16.0368 8.64298 15.284L6.93817 14.5072C4.31272 13.3109 3 12.7127 3 11.7309C3 11.5031 3.07067 11.2959 3.212 11.0972" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M20.3767 16.2661C20.7922 16.5971 21 16.927 21 17.3176C21 18.2995 19.6873 18.8976 17.0618 20.0939L15.357 20.8707C13.7048 21.6236 12.8786 22 12 22C11.1214 22 10.2952 21.6236 8.64298 20.8707L6.93817 20.0939C4.31272 18.8976 3 18.2995 3 17.3176C3 16.927 3.20778 16.5971 3.62334 16.2661" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  play: '<path d="M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/>',
  eye: '<path d="M21.544 11.045C21.848 11.4713 22 11.6845 22 12C22 12.3155 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.3155 2 12C2 11.6845 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z" stroke="currentColor" stroke-width="1.5"/><path d="M15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12Z" stroke="currentColor" stroke-width="1.5"/>',
  merge: '<path d="M7 20C8.10457 20 9 19.1046 9 18C9 16.8954 8.10457 16 7 16C5.89543 16 5 16.8954 5 18C5 19.1046 5.89543 20 7 20Z" stroke="currentColor" stroke-width="1.5"/><path d="M7 8C8.10457 8 9 7.10457 9 6C9 4.89543 8.10457 4 7 4C5.89543 4 5 4.89543 5 6C5 7.10457 5.89543 8 7 8Z" stroke="currentColor" stroke-width="1.5"/><path d="M17 14C18.1046 14 19 13.1046 19 12C19 10.8954 18.1046 10 17 10C15.8954 10 15 10.8954 15 12C15 13.1046 15.8954 14 17 14Z" stroke="currentColor" stroke-width="1.5"/><path d="M7.02116 8.2793V15.4073M14.4113 12.0047L10.0193 12.0048C8.92158 12.0048 6.86182 11.1254 7.01818 8.78001" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>'
}

function icon (name, size = 16) {
  return `<svg class="hgi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${ICON_PATHS[name]}</svg>`
}

const THEME_KEY = 'nala-diary-theme'
const HEATMAP_WEEKS = 20
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

let allEntries = []
let currentDate = null
let repoLinks = {}
let spritesLoaded = false
let spriteSourcesLoaded = false
let flowLoaded = false
let flowAnimNames = []
let flowEdges = []
let flowNodeData = {}   // name -> { image, row, frames, fps, cw, ch } — para animar previews inline

const NOMBRES_SPRITE = {
  idle: 'respirando',
  sit: 'sentada',
  alert: 'alerta',
  walk: 'caminando',
  run: 'corriendo',
  sleep: 'dormida',
  loaf: 'echada (pan)',
  dig: 'escarbando',
  scratch: 'rascando el poste',
  groom: 'acicalandose',
  stretch: 'estirandose',
  fall: 'cayendo',
  climb: 'trepando',
  eat: 'comiendo',
  crouch: 'agazapada',
  stalk: 'acechando',
  rear: 'parada en dos patas',
  angry: 'enojada',
  rascarse: 'rascarse',
  blep: 'lengua afuera',
  frotar: 'frotar',
  olfatear: 'olfatear',
  sacudirse: 'sacudirse',
  amasar: 'amasar',
  startle: 'sobresaltada',
  yawn: 'bostezando',
  pounce: 'saltando (ataque)',
  play: 'jugando',
  slide: 'derrape'
}

function applyTheme (theme) {
  document.body.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}

function escapeHtml (s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

function todayUTC () {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function isoDate (d) {
  return d.toISOString().slice(0, 10)
}

function shiftDate (fecha, delta) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return isoDate(d)
}

function fmtDayLabel (fecha) {
  const d = new Date(`${fecha}T00:00:00Z`)
  const txt = `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
  return fecha === isoDate(todayUTC()) ? `${txt} · HOY` : txt
}

function renderStats (stats) {
  document.getElementById('stats').innerHTML = `
    <div class="stat">${stats.totalEntries} ENTRADAS</div>
    <div class="stat">${stats.activeDays} DIAS</div>
    <div class="stat">🔥 ${stats.streak}</div>
  `
}

function renderHeatmap (heatmap) {
  const el = document.getElementById('heatmap')
  const monthsEl = document.getElementById('heatmapMonths')
  el.innerHTML = ''
  monthsEl.innerHTML = ''

  const today = todayUTC()
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - (HEATMAP_WEEKS * 7 - 1))
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  let lastMonth = -1
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const weekStart = new Date(start)
    weekStart.setUTCDate(weekStart.getUTCDate() + w * 7)
    const label = document.createElement('div')
    if (weekStart.getUTCMonth() !== lastMonth) {
      label.textContent = MESES[weekStart.getUTCMonth()].slice(0, 3)
      lastMonth = weekStart.getUTCMonth()
    }
    monthsEl.appendChild(label)
  }

  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const fecha = isoDate(d)
    const count = heatmap[fecha] || 0
    const cell = document.createElement('div')
    cell.className = 'heatmap-cell'
    cell.title = `${fecha}: ${count}`
    if (d > today) cell.style.visibility = 'hidden'
    else if (count > 0) {
      cell.style.background = 'var(--accent)'
      cell.style.opacity = String(Math.min(1, 0.35 + count * 0.2))
    }
    cell.addEventListener('click', () => { if (d <= today) selectDate(fecha) })
    el.appendChild(cell)
  }
}

function populateProjectFilter () {
  const sel = document.getElementById('projectFilter')
  const previo = sel.value
  const proyectos = [...new Set(allEntries.map((e) => e.proyecto).filter(Boolean))].sort()
  sel.innerHTML = '<option value="">Todos los proyectos</option>' +
    proyectos.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p.toUpperCase())}</option>`).join('')
  sel.value = proyectos.includes(previo) ? previo : ''
}

function renderEntries () {
  document.getElementById('dayLabel').textContent = fmtDayLabel(currentDate)
  document.getElementById('todayBtn').classList.toggle('hidden', currentDate === isoDate(todayUTC()))

  const proyectoFiltro = document.getElementById('projectFilter').value
  const el = document.getElementById('entries')
  el.innerHTML = ''

  const delDia = allEntries
    .filter((e) => e.fecha === currentDate && (!proyectoFiltro || e.proyecto === proyectoFiltro))
    .sort((a, b) => b.hora.localeCompare(a.hora))

  if (!delDia.length) {
    el.innerHTML = '<div class="empty">Sin entradas ese dia.</div>'
    return
  }

  for (const e of delDia) {
    const div = document.createElement('div')
    div.className = 'entry'
    const proyecto = e.proyecto ? e.proyecto.toUpperCase() : 'NOTA'
    const repoUrl = e.proyecto && repoLinks[e.proyecto]
    const link = repoUrl && e.hash
      ? `<button class="gh-link" data-url="${escapeHtml(repoUrl)}/commit/${escapeHtml(e.hash)}">${icon('github', 12)} Ver en GitHub</button>`
      : ''
    div.innerHTML = `
      <div class="entry-meta">${e.hora} · ${escapeHtml(proyecto)}${link}</div>
      <div class="entry-title">${escapeHtml(e.mensaje)}</div>
    `
    el.appendChild(div)
  }
}

function selectDate (fecha) {
  currentDate = fecha
  renderEntries()
}

function renderReports (reports) {
  document.getElementById('weeklySummary').textContent = reports.weeklySummary

  const byProjectEl = document.getElementById('byProject')
  byProjectEl.innerHTML = ''
  const maxCount = Math.max(1, ...reports.byProject.map((p) => p.count))
  for (const p of reports.byProject) {
    const row = document.createElement('div')
    row.className = 'bar-row'
    row.innerHTML = `
      <span class="bar-label">${escapeHtml(p.proyecto)}</span>
      <div class="bar" style="width:${Math.round((p.count / maxCount) * 100)}px"></div>
      <span>${p.count}</span>
    `
    byProjectEl.appendChild(row)
  }

  const byDayEl = document.getElementById('byDay')
  byDayEl.innerHTML = ''
  const maxDay = Math.max(1, ...reports.byDay.map((d) => d.count))
  const hoy = isoDate(todayUTC())
  for (const d of reports.byDay) {
    const bar = document.createElement('div')
    bar.className = 'day-bar' + (d.fecha === hoy ? ' today' : '')
    bar.style.height = `${Math.round((d.count / maxDay) * 100)}%`
    bar.title = `${d.fecha}: ${d.count}`
    byDayEl.appendChild(bar)
  }

  const total = reports.byHour.manana + reports.byHour.tarde + reports.byHour.noche
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  document.getElementById('byHour').innerHTML = `
    🌅 mañana ${pct(reports.byHour.manana)}%<br>
    🌤️ tarde ${pct(reports.byHour.tarde)}%<br>
    🌙 noche ${pct(reports.byHour.noche)}%
  `
}

function renderBoard (cards) {
  for (const columna of ['todo', 'doing', 'done']) {
    const el = document.querySelector(`.cards[data-columna="${columna}"]`)
    el.innerHTML = ''
    const delaColumna = cards.filter((c) => c.columna === columna).sort((a, b) => a.posicion - b.posicion)
    for (const c of delaColumna) {
      const div = document.createElement('div')
      div.className = 'card'
      div.draggable = true
      div.dataset.id = c.id
      div.innerHTML = `
        <span class="card-text">${escapeHtml(c.texto)}</span>
        <button class="card-delete" data-id="${c.id}" title="Borrar">${icon('close', 13)}</button>
      `
      el.appendChild(div)
    }
  }
}

async function reloadBoard () {
  try {
    const cards = await window.diary.getCards()
    renderBoard(cards)
  } catch (err) {
    console.error('[diary] no pude cargar el tablero:', err)
  }
}

let selectedTaskId = null

function fmtDueDate (fechaLimite) {
  if (!fechaLimite) return null
  const hoy = todayUTC()
  const d = new Date(`${fechaLimite}T00:00:00Z`)
  const diffDays = Math.round((d - hoy) / 86400000)
  if (diffDays < 0) return { text: 'vencida', overdue: true }
  if (diffDays === 0) return { text: 'hoy', overdue: false }
  if (diffDays === 1) return { text: 'mañana', overdue: false }
  if (diffDays <= 6) return { text: `en ${diffDays} dias`, overdue: false }
  return { text: fechaLimite, overdue: false }
}

const ESTADO_PILL = {
  todo: '<span class="status-pill status-todo">PENDIENTE</span>',
  doing: '<span class="status-pill status-doing">EN CURSO</span>',
  done: '<span class="status-pill status-done">COMPLETADO</span>'
}

function renderTasks (tasks) {
  for (const estado of ['todo', 'doing', 'done']) {
    const delEstado = tasks.filter((t) => t.estado === estado).sort((a, b) => a.posicion - b.posicion)
    const el = document.querySelector(`.task-rows[data-estado="${estado}"]`)
    el.innerHTML = ''
    for (const t of delEstado) {
      const row = document.createElement('tr')
      row.className = t.id === selectedTaskId ? 'selected' : ''
      row.dataset.id = t.id
      const due = fmtDueDate(t.fechaLimite)
      row.innerHTML = `
        <td class="task-name-cell">
          <span class="task-name-icon${estado === 'done' ? ' estado-done' : ''}">${estado === 'done' ? icon('checkCircle', 14) : ''}</span>
          ${escapeHtml(t.titulo)}
        </td>
        <td class="task-due-cell${due && due.overdue ? ' overdue' : ''}">${due ? due.text : '—'}</td>
        <td><span class="prio-flag prio-${t.prioridad}">${icon('flag', 13)}</span></td>
        <td>${ESTADO_PILL[estado]}</td>
        <td class="comment-count-cell">${icon('comment', 13)}</td>
      `
      el.appendChild(row)
    }
  }
  document.getElementById('countTodo').textContent = tasks.filter((t) => t.estado === 'todo').length
  document.getElementById('countDoing').textContent = tasks.filter((t) => t.estado === 'doing').length
  document.getElementById('countDone').textContent = tasks.filter((t) => t.estado === 'done').length
}

let currentProjectId = null
let lastLoadedTasks = []

async function loadTasks () {
  if (!currentProjectId) return
  try {
    lastLoadedTasks = await window.diary.getTasks(currentProjectId)
    renderFilteredTasks()
  } catch (err) {
    console.error('[diary] no pude cargar las tareas:', err)
  }
}

function renderFilteredTasks () {
  const term = document.getElementById('taskSearchInput').value.trim().toLowerCase()
  const tasks = term ? lastLoadedTasks.filter((t) => t.titulo.toLowerCase().includes(term)) : lastLoadedTasks
  renderTasks(tasks)
}

let loadedProjects = []

function updateBreadcrumb () {
  const p = loadedProjects.find((pr) => pr.id === currentProjectId)
  document.getElementById('proyectoBreadcrumbName').textContent = p ? p.nombre : '—'
}

function renderProjects (projects) {
  loadedProjects = projects
  const el = document.getElementById('projectSwitcher')
  el.innerHTML = ''
  for (const p of projects) {
    const pill = document.createElement('div')
    pill.className = 'project-pill' + (p.id === currentProjectId ? ' active' : '')
    pill.dataset.id = p.id
    pill.innerHTML = `
      <span class="project-pill-icon">${icon('folder', 14)}</span>
      <span class="project-pill-name">${escapeHtml(p.nombre)}</span>
      <span class="project-pill-count">${p.taskCount}</span>
      ${projects.length > 1 ? `<button type="button" class="project-pill-delete" data-id="${p.id}" title="Borrar proyecto">${icon('trash', 12)}</button>` : ''}
    `
    pill.addEventListener('click', (e) => {
      if (e.target.closest('.project-pill-delete')) return
      selectProject(p.id)
    })
    el.appendChild(pill)
  }
  updateBreadcrumb()
}

function selectProject (id) {
  currentProjectId = id
  closeTaskDetail()
  document.querySelectorAll('.project-pill').forEach((p) => p.classList.toggle('active', Number(p.dataset.id) === id))
  updateBreadcrumb()
  loadTasks()
}

async function loadProjects () {
  try {
    const projects = await window.diary.getProjects()
    if (!currentProjectId && projects.length) currentProjectId = projects[0].id
    renderProjects(projects)
    loadTasks()
  } catch (err) {
    console.error('[diary] no pude cargar los proyectos:', err)
  }
}

function renderComments (comments) {
  const el = document.getElementById('taskComments')
  el.innerHTML = ''
  if (!comments.length) {
    el.innerHTML = '<div class="empty">Sin comentarios todavia.</div>'
    return
  }
  for (const c of comments) {
    const div = document.createElement('div')
    div.className = 'comment'
    div.innerHTML = `
      <div class="comment-meta">
        <span>${fmtShareDate(c.createdAt)}</span>
        <button class="comment-delete" data-id="${c.id}" title="Borrar">${icon('close', 13)}</button>
      </div>
      <div class="comment-texto">${escapeHtml(c.texto)}</div>
    `
    el.appendChild(div)
  }
}

async function loadComments (taskId) {
  try {
    renderComments(await window.diary.getComments(taskId))
  } catch (err) {
    console.error('[diary] no pude cargar los comentarios:', err)
  }
}

async function openTaskDetail (id) {
  try {
    const task = await window.diary.getTask(id)
    selectedTaskId = task.id
    document.getElementById('taskTitulo').value = task.titulo
    document.getElementById('taskPrioridad').value = task.prioridad
    document.getElementById('taskEstado').value = task.estado
    document.getElementById('taskFecha').value = task.fechaLimite || ''
    document.getElementById('taskDescripcion').value = task.descripcion || ''
    document.getElementById('taskDetail').classList.remove('hidden')
    document.querySelectorAll('.task-rows tr').forEach((r) => r.classList.toggle('selected', Number(r.dataset.id) === id))
    loadComments(id)
  } catch (err) {
    console.error('[diary] no pude abrir la tarea:', err)
  }
}

function closeTaskDetail () {
  selectedTaskId = null
  document.getElementById('taskDetail').classList.add('hidden')
  document.querySelectorAll('.task-rows tr').forEach((r) => r.classList.remove('selected'))
}

async function saveSelectedTask (changes) {
  if (!selectedTaskId) return
  try {
    await window.diary.updateTask(selectedTaskId, changes)
    loadTasks()
  } catch (err) {
    console.error('[diary] no pude guardar la tarea:', err)
  }
}

function isSpriteRowBlank (image, row, frames, cw, ch) {
  const off = document.createElement('canvas')
  off.width = frames * cw
  off.height = ch
  const octx = off.getContext('2d')
  octx.drawImage(image, 0, row * ch, frames * cw, ch, 0, 0, frames * cw, ch)
  const data = octx.getImageData(0, 0, frames * cw, ch).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) return false
  }
  return true
}

function animateSprite (canvas, image, a, cw, ch) {
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const start = performance.now()

  function frame (now) {
    const elapsed = now - start
    let idx = Math.floor((elapsed / 1000) * a.fps)
    idx = a.loop
      ? ((idx % a.frames) + a.frames) % a.frames
      : Math.max(0, Math.min(idx, a.frames - 1))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, idx * cw, a.row * ch, cw, ch, 0, 0, canvas.width, canvas.height)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

async function loadSpriteViewer () {
  if (spritesLoaded) return
  spritesLoaded = true
  const status = document.getElementById('spriteStatus')

  const jsonUrl = '../../../assets/sprites/v4/cat.json'
  const pngUrl = '../../../assets/sprites/v4/cat.png'
  const resolvedPath = new URL(pngUrl, document.baseURI).pathname
  document.getElementById('spritePath').textContent = `Leyendo de: ${resolvedPath}`

  try {
    const [meta, image] = await Promise.all([
      fetch(jsonUrl).then((r) => r.json()),
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = pngUrl
      })
    ])

    const cw = meta.cell[0]
    const ch = meta.cell[1]
    const grid = document.getElementById('spriteGrid')
    let mostradas = 0

    for (const [name, a] of Object.entries(meta.animations)) {
      if (isSpriteRowBlank(image, a.row, a.frames, cw, ch)) continue
      mostradas++

      const cell = document.createElement('div')
      cell.className = 'sprite-cell'

      const canvas = document.createElement('canvas')
      canvas.width = cw * 2
      canvas.height = ch * 2
      cell.appendChild(canvas)

      const label = document.createElement('div')
      label.className = 'sprite-name'
      label.textContent = NOMBRES_SPRITE[name] || name
      cell.appendChild(label)

      const info = document.createElement('div')
      info.className = 'sprite-meta'
      info.textContent = `${name} · ${a.frames} frames · ${a.fps}fps`
      cell.appendChild(info)

      grid.appendChild(cell)
      animateSprite(canvas, image, a, cw, ch)
    }

    status.textContent = `${mostradas} de ${Object.keys(meta.animations).length} animaciones tienen arte real`
  } catch (err) {
    console.error('[diary] no pude cargar los sprites:', err)
    status.textContent = 'No pude cargar los sprites.'
  }
}

async function loadSpriteSources () {
  if (spriteSourcesLoaded) return
  spriteSourcesLoaded = true
  const status = document.getElementById('spriteSourcesStatus')
  const grid = document.getElementById('spriteSourcesGrid')
  const baseUrl = '../../../sf-sprite-nala/'
  document.getElementById('spriteSourcesPath').textContent =
    `Leyendo de: ${new URL(baseUrl, document.baseURI).pathname}`

  try {
    const sources = await window.diary.getSpriteSources()
    if (!sources.length) {
      status.textContent = 'No hay carpetas en sf-sprite-nala/.'
      return
    }
    status.textContent = `${sources.length} carpetas`

    for (const { name, metadata } of sources) {
      const fw = metadata.frame_w || 256
      const fh = metadata.frame_h || 256
      const frames = metadata.frame_count || 1
      const fps = metadata.fps || 8
      const src = baseUrl + name.split('/').map(encodeURIComponent).join('/') + '/spritesheet.png'

      const cell = document.createElement('div')
      cell.className = 'sprite-cell'

      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      cell.appendChild(canvas)

      const label = document.createElement('div')
      label.className = 'sprite-name'
      label.textContent = name
      cell.appendChild(label)

      const info = document.createElement('div')
      info.className = 'sprite-meta'
      info.textContent = `${frames} frames · ${fps}fps`
      cell.appendChild(info)

      grid.appendChild(cell)

      const img = new Image()
      img.onload = () => animateSprite(canvas, img, { row: 0, frames, fps, loop: true }, fw, fh)
      img.onerror = () => { info.textContent += ' · no cargo la imagen' }
      img.src = src
    }
  } catch (err) {
    console.error('[diary] no pude cargar sf-sprite-nala:', err)
    status.textContent = 'No pude leer sf-sprite-nala/.'
  }
}

/** Nombre para mostrar: las fuentes sin procesar llevan prefijo "raw:" internamente. */
function flowNodeLabel (name) {
  if (name.startsWith('raw:')) return `${name.slice(4)} (sin procesar)`
  return NOMBRES_SPRITE[name] || name
}

/**
 * Recorre las conexiones y arma las cadenas completas para mostrar arriba,
 * tipo "idle -> loaf -> sleep -> idle". Si un nodo tiene mas de una salida,
 * cada rama sale como su propia linea. Si vuelve a un nodo ya visitado en esa
 * misma linea, corta ahi y lo marca como loop en vez de seguir infinito.
 */
function buildFlowChains (edges) {
  if (!edges.length) return []
  const outMap = {}
  for (const { from, to } of edges) {
    if (!outMap[from]) outMap[from] = []
    outMap[from].push(to)
  }
  const tienenEntrada = new Set(edges.map((e) => e.to))
  const heads = Object.keys(outMap).filter((n) => !tienenEntrada.has(n))
  const arranques = heads.length ? heads : Object.keys(outMap)

  const chains = []
  const walk = (node, visited, path) => {
    if (visited.has(node)) {
      chains.push([...path, { node, loop: true }])
      return
    }
    const nextVisited = new Set(visited).add(node)
    const outs = outMap[node]
    if (!outs || !outs.length) {
      chains.push([...path, { node, loop: false }])
      return
    }
    for (const next of outs) walk(next, nextVisited, [...path, { node, loop: false }])
  }
  for (const head of arranques) walk(head, new Set(), [])
  return chains
}

let flowChainRafIds = []

function animateChainThumb (canvas, node) {
  const data = flowNodeData[node]
  if (!data) return
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const { image, row, frames, fps, cw, ch } = data
  const start = performance.now()
  function frame (now) {
    const elapsed = now - start
    let idx = Math.floor((elapsed / 1000) * fps)
    idx = ((idx % frames) + frames) % frames
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, idx * cw, row * ch, cw, ch, 0, 0, canvas.width, canvas.height)
    flowChainRafIds.push(requestAnimationFrame(frame))
  }
  flowChainRafIds.push(requestAnimationFrame(frame))
}

function renderFlowChains () {
  const el = document.getElementById('flowChainResult')
  flowChainRafIds.forEach((id) => cancelAnimationFrame(id))
  flowChainRafIds = []

  const chains = buildFlowChains(flowEdges)
  if (!chains.length) {
    el.innerHTML = ''
    el.className = 'empty'
    el.textContent = 'Sin conexiones todavia.'
    return
  }
  el.className = ''
  el.innerHTML = ''
  chains.forEach((chain) => {
    const line = document.createElement('div')
    line.className = 'flow-chain-line'
    chain.forEach((step, i) => {
      if (i > 0) {
        const arrow = document.createElement('span')
        arrow.className = 'flow-chain-arrow'
        arrow.textContent = '→'
        line.appendChild(arrow)
      }
      const stepEl = document.createElement('span')
      stepEl.className = step.loop ? 'flow-chain-loop' : 'flow-chain-node'

      if (flowNodeData[step.node]) {
        const canvas = document.createElement('canvas')
        canvas.width = 28
        canvas.height = 28
        canvas.className = 'flow-chain-thumb'
        stepEl.appendChild(canvas)
        animateChainThumb(canvas, step.node)
      }

      const label = document.createElement('span')
      label.textContent = flowNodeLabel(step.node) + (step.loop ? ' (repite)' : '')
      stepEl.appendChild(label)

      line.appendChild(stepEl)
    })
    el.appendChild(line)
  })
}

function renderFlowEdges () {
  renderFlowChains()
  const el = document.getElementById('flowEdgeList')
  el.innerHTML = ''
  if (!flowEdges.length) {
    el.innerHTML = '<div class="empty">Sin conexiones todavia.</div>'
    return
  }
  flowEdges.forEach((edge, i) => {
    const row = document.createElement('div')
    row.className = 'flow-edge-row'
    row.innerHTML = `
      <strong>${escapeHtml(flowNodeLabel(edge.from))}</strong> ${icon('arrowRight', 12)} <strong>${escapeHtml(flowNodeLabel(edge.to))}</strong>
      <button type="button" class="flow-edge-delete" data-i="${i}" title="Borrar">${icon('close', 12)}</button>
    `
    el.appendChild(row)
  })
}

function populateFlowSelects () {
  const opts = flowAnimNames.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(flowNodeLabel(n))}</option>`).join('')
  document.getElementById('flowFrom').innerHTML = opts
  document.getElementById('flowTo').innerHTML = opts
}

async function saveFlowEdges () {
  try {
    await window.diary.saveFlow({ edges: flowEdges })
  } catch (err) {
    console.error('[diary] no pude guardar el flujo:', err)
  }
}

async function loadFlowEditor () {
  if (flowLoaded) return
  flowLoaded = true
  const grid = document.getElementById('flowNodeGrid')

  try {
    const [meta, image, flow] = await Promise.all([
      fetch('../../../assets/sprites/v4/cat.json').then((r) => r.json()),
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = '../../../assets/sprites/v4/cat.png'
      }),
      window.diary.getFlow()
    ])

    const cw = meta.cell[0]
    const ch = meta.cell[1]
    flowEdges = (flow && Array.isArray(flow.edges)) ? flow.edges : []
    flowAnimNames = []

    for (const [name, a] of Object.entries(meta.animations)) {
      if (isSpriteRowBlank(image, a.row, a.frames, cw, ch)) continue
      flowAnimNames.push(name)
      flowNodeData[name] = { image, row: a.row, frames: a.frames, fps: a.fps, loop: true, cw, ch }

      const cell = document.createElement('div')
      cell.className = 'sprite-cell'

      const canvas = document.createElement('canvas')
      canvas.width = 96
      canvas.height = 96
      cell.appendChild(canvas)

      const label = document.createElement('div')
      label.className = 'sprite-name'
      label.textContent = NOMBRES_SPRITE[name] || name
      cell.appendChild(label)

      grid.appendChild(cell)
      animateSprite(canvas, image, a, cw, ch)
    }

    // Las fuentes de sf-sprite-nala/ todavia no estan mergeadas al cat.png —
    // no se pueden reproducir de verdad (ver flow.js en cat.js, que ignora
    // las conexiones a "raw:"), pero sirven para planear la secuencia antes
    // de procesarlas. Van con prefijo "raw:" para no chocar con un nombre de
    // animacion real, y marcadas como sin procesar en todos lados.
    try {
      const sources = await window.diary.getSpriteSources()
      for (const { name, metadata } of sources) {
        const value = `raw:${name}`
        flowAnimNames.push(value)

        const fw = metadata.frame_w || 256
        const fh = metadata.frame_h || 256
        const frames = metadata.frame_count || 1
        const fps = metadata.fps || 8
        const src = '../../../sf-sprite-nala/' + name.split('/').map(encodeURIComponent).join('/') + '/spritesheet.png'

        const cell = document.createElement('div')
        cell.className = 'sprite-cell'

        const canvas = document.createElement('canvas')
        canvas.width = 96
        canvas.height = 96
        cell.appendChild(canvas)

        const label = document.createElement('div')
        label.className = 'sprite-name'
        label.textContent = name
        cell.appendChild(label)

        const badge = document.createElement('div')
        badge.className = 'sprite-meta'
        badge.textContent = 'sin procesar'
        cell.appendChild(badge)

        grid.appendChild(cell)

        const img = new Image()
        img.onload = () => {
          flowNodeData[value] = { image: img, row: 0, frames, fps, loop: true, cw: fw, ch: fh }
          animateSprite(canvas, img, { row: 0, frames, fps, loop: true }, fw, fh)
          renderFlowChains()
        }
        img.src = src
      }
    } catch (err) {
      console.error('[diary] no pude sumar sf-sprite-nala al editor de flujo:', err)
    }

    populateFlowSelects()
    renderFlowEdges()
  } catch (err) {
    console.error('[diary] no pude cargar el editor de flujo:', err)
  }
}

let pickedFilePath = null

function fmtShareDate (createdAt) {
  // createdAt viene 'YYYY-MM-DD HH:MM:SS' de MySQL.
  return createdAt.replace(' ', ' · ').slice(0, 19)
}

async function renderShares (shares) {
  const el = document.getElementById('shares')
  el.innerHTML = ''
  if (!shares.length) {
    el.innerHTML = '<div class="empty">Todavia no compartiste nada.</div>'
    return
  }

  for (const s of shares) {
    const div = document.createElement('div')
    div.className = 'share'

    const meta = document.createElement('div')
    meta.className = 'share-meta'
    meta.innerHTML = `<span>${fmtShareDate(s.createdAt)} · ${s.tipo.toUpperCase()}</span>
      <button class="share-delete" data-id="${s.id}" title="Borrar">${icon('close', 13)}</button>`
    div.appendChild(meta)

    if (s.texto) {
      const texto = document.createElement('div')
      texto.className = 'share-texto'
      texto.textContent = s.texto
      div.appendChild(texto)
    }

    if (s.filename) {
      const media = document.createElement('div')
      media.className = 'share-media'
      if (s.tipo === 'imagen') {
        const img = document.createElement('img')
        window.diary.getShareFile(s.id).then(({ mime, base64 }) => { img.src = `data:${mime};base64,${base64}` })
        media.appendChild(img)
      } else if (s.tipo === 'audio' || s.tipo === 'video') {
        const player = document.createElement(s.tipo === 'audio' ? 'audio' : 'video')
        player.controls = true
        const btn = document.createElement('button')
        btn.className = 'share-file-link'
        btn.textContent = `▶ cargar ${s.filename}`
        btn.addEventListener('click', async () => {
          const { mime, base64 } = await window.diary.getShareFile(s.id)
          player.src = `data:${mime};base64,${base64}`
          btn.remove()
          media.insertBefore(player, media.firstChild)
          player.play()
        })
        media.appendChild(btn)
      } else {
        const link = document.createElement('span')
        link.className = 'share-file-link'
        link.textContent = `⬇ descargar ${s.filename}`
        link.addEventListener('click', () => window.diary.saveShareFile(s.id, s.filename))
        media.appendChild(link)
      }
      div.appendChild(media)
    }

    el.appendChild(div)
  }
}

async function loadShares () {
  try {
    const shares = await window.diary.getShares()
    renderShares(shares)
  } catch (err) {
    console.error('[diary] no pude cargar lo compartido:', err)
  }
}

function showConnError (show) {
  document.getElementById('connError').classList.toggle('hidden', !show)
}

async function loadAndRender () {
  try {
    const [data, links] = await Promise.all([window.diary.getData(), window.diary.getRepoLinks()])
    showConnError(false)
    allEntries = data.entries
    repoLinks = links
    if (!currentDate) currentDate = isoDate(todayUTC())
    renderStats(data.stats)
    renderHeatmap(data.stats.heatmap)
    populateProjectFilter()
    renderEntries()
    renderReports(data.reports)
    reloadBoard()
  } catch (err) {
    console.error('[diary] no pude cargar los datos:', err)
    showConnError(true)
  }
}

document.getElementById('closeBtn').addEventListener('click', () => window.close())
document.getElementById('showCatBtn').addEventListener('click', () => window.close())

document.getElementById('entries').addEventListener('click', (e) => {
  const btn = e.target.closest('.gh-link')
  if (btn) window.diary.openExternal(btn.dataset.url)
})

document.getElementById('themeToggle').addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark')
})

const VIEWS = ['diario', 'tablero', 'reportes', 'sprites', 'compartir', 'proyectos', 'flujo']
document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-view]').forEach((n) => n.classList.remove('active'))
    item.classList.add('active')
    for (const v of VIEWS) {
      document.getElementById(`view${v[0].toUpperCase()}${v.slice(1)}`).classList.toggle('hidden', item.dataset.view !== v)
    }
    if (item.dataset.view === 'sprites') { loadSpriteViewer(); loadSpriteSources() }
    if (item.dataset.view === 'compartir') loadShares()
    if (item.dataset.view === 'proyectos') loadProjects()
  })
})

document.querySelectorAll('.tab[data-spritetab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-spritetab]').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById('spriteTabProcesadas').classList.toggle('hidden', tab.dataset.spritetab !== 'procesadas')
    document.getElementById('spriteTabFuentes').classList.toggle('hidden', tab.dataset.spritetab !== 'fuentes')
  })
})

document.querySelectorAll('.tab[data-flujotab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-flujotab]').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById('flujoTabArquitectura').classList.toggle('hidden', tab.dataset.flujotab !== 'arquitectura')
    document.getElementById('flujoTabSprites').classList.toggle('hidden', tab.dataset.flujotab !== 'sprites')
    document.getElementById('flujoTabSecuencia').classList.toggle('hidden', tab.dataset.flujotab !== 'secuencia')
    if (tab.dataset.flujotab === 'secuencia') loadFlowEditor()
  })
})

document.getElementById('prevDay').addEventListener('click', () => selectDate(shiftDate(currentDate, -1)))
document.getElementById('nextDay').addEventListener('click', () => {
  const next = shiftDate(currentDate, 1)
  if (next <= isoDate(todayUTC())) selectDate(next)
})
document.getElementById('todayBtn').addEventListener('click', () => selectDate(isoDate(todayUTC())))
document.getElementById('projectFilter').addEventListener('change', renderEntries)

document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('noteInput')
  const mensaje = input.value.trim()
  if (!mensaje) return
  try {
    await window.diary.addNote({ mensaje })
    input.value = ''
  } catch (err) {
    console.error('[diary] no pude guardar la nota:', err)
    showConnError(true)
    return
  }
  currentDate = isoDate(todayUTC())
  loadAndRender()
})

document.querySelectorAll('.card-form').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = form.querySelector('input')
    const texto = input.value.trim()
    if (!texto) return
    try {
      await window.diary.createCard({ texto, columna: form.dataset.columna })
      input.value = ''
      reloadBoard()
    } catch (err) {
      console.error('[diary] no pude crear la tarjeta:', err)
    }
  })
})

document.querySelectorAll('.cards').forEach((col) => {
  col.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card')
    if (!card) return
    e.dataTransfer.setData('text/plain', card.dataset.id)
    card.classList.add('dragging')
  })
  col.addEventListener('dragend', (e) => {
    const card = e.target.closest('.card')
    if (card) card.classList.remove('dragging')
  })
  col.addEventListener('dragover', (e) => {
    e.preventDefault()
    col.classList.add('drag-over')
  })
  col.addEventListener('dragleave', () => col.classList.remove('drag-over'))
  col.addEventListener('drop', async (e) => {
    e.preventDefault()
    col.classList.remove('drag-over')
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    const posicion = col.querySelectorAll('.card').length
    try {
      await window.diary.updateCard(id, { columna: col.dataset.columna, posicion })
      reloadBoard()
    } catch (err) {
      console.error('[diary] no pude mover la tarjeta:', err)
    }
  })
  col.addEventListener('click', async (e) => {
    const btn = e.target.closest('.card-delete')
    if (!btn) return
    try {
      await window.diary.deleteCard(btn.dataset.id)
      reloadBoard()
    } catch (err) {
      console.error('[diary] no pude borrar la tarjeta:', err)
    }
  })
})

function setPickedFile (filePath) {
  pickedFilePath = filePath
  document.getElementById('pickedFileName').textContent = filePath ? `Elegido: ${filePath.split('/').pop()}` : ''
}

const dropZone = document.getElementById('dropZone')
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('drag-over')
  const file = e.dataTransfer.files[0]
  if (!file) return
  setPickedFile(window.diary.pathForFile(file))
})

document.getElementById('pickFileBtn').addEventListener('click', async () => {
  const filePath = await window.diary.pickShareFile()
  if (filePath) setPickedFile(filePath)
})

document.getElementById('shareForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('shareInput')
  const texto = input.value.trim()
  if (!texto && !pickedFilePath) return
  try {
    if (pickedFilePath) await window.diary.createShareFile(pickedFilePath, texto || null)
    else await window.diary.createShare(texto)
    input.value = ''
    setPickedFile(null)
    loadShares()
  } catch (err) {
    console.error('[diary] no pude compartir:', err)
  }
})

document.getElementById('shares').addEventListener('click', async (e) => {
  const btn = e.target.closest('.share-delete')
  if (!btn) return
  if (!confirm('¿Borrar esto? Si tiene un archivo, se borra tambien de R2.')) return
  try {
    await window.diary.deleteShare(btn.dataset.id)
    loadShares()
  } catch (err) {
    console.error('[diary] no pude borrar lo compartido:', err)
  }
})

document.querySelectorAll('.task-form').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = form.querySelector('input')
    const titulo = input.value.trim()
    if (!titulo) return
    try {
      await window.diary.createTask({ proyectoId: currentProjectId, titulo, estado: form.dataset.estado })
      input.value = ''
      loadTasks()
      loadProjects()
    } catch (err) {
      console.error('[diary] no pude crear la tarea:', err)
    }
  })
})

document.getElementById('addProjectForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('addProjectInput')
  const nombre = input.value.trim()
  if (!nombre) return
  try {
    const project = await window.diary.createProject(nombre)
    input.value = ''
    currentProjectId = project.id
    loadProjects()
  } catch (err) {
    console.error('[diary] no pude crear el proyecto:', err)
  }
})

document.getElementById('topAddTaskBtn').addEventListener('click', () => {
  document.querySelector('.add-task-row[data-estado="todo"] input').focus()
})

document.getElementById('taskSearchInput').addEventListener('input', renderFilteredTasks)

document.getElementById('projectSwitcher').addEventListener('click', async (e) => {
  const btn = e.target.closest('.project-pill-delete')
  if (!btn) return
  const id = Number(btn.dataset.id)
  const project = loadedProjects.find((p) => p.id === id)
  if (!project) return
  if (!confirm(`¿Borrar el proyecto "${project.nombre}" y sus ${project.taskCount} tareas?`)) return
  try {
    await window.diary.deleteProject(id)
    if (currentProjectId === id) currentProjectId = null
    loadProjects()
  } catch (err) {
    console.error('[diary] no pude borrar el proyecto:', err)
  }
})

document.querySelectorAll('.task-rows').forEach((col) => {
  col.addEventListener('click', (e) => {
    const row = e.target.closest('tr')
    if (row) openTaskDetail(Number(row.dataset.id))
  })
})

document.querySelectorAll('.task-group-header').forEach((header) => {
  header.addEventListener('click', (e) => {
    if (e.target.closest('.group-add-btn')) return
    header.closest('.task-group').classList.toggle('collapsed')
  })
})

document.querySelectorAll('.group-add-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const group = btn.closest('.task-group')
    group.classList.remove('collapsed')
    group.querySelector('.add-task-row input').focus()
  })
})

document.getElementById('taskDetailClose').addEventListener('click', closeTaskDetail)

document.getElementById('taskTitulo').addEventListener('change', (e) => saveSelectedTask({ titulo: e.target.value.trim() }))
document.getElementById('taskPrioridad').addEventListener('change', (e) => saveSelectedTask({ prioridad: e.target.value }))
document.getElementById('taskEstado').addEventListener('change', (e) => saveSelectedTask({ estado: e.target.value }))
document.getElementById('taskFecha').addEventListener('change', (e) => saveSelectedTask({ fechaLimite: e.target.value || null }))
document.getElementById('taskDescripcion').addEventListener('change', (e) => saveSelectedTask({ descripcion: e.target.value }))

document.getElementById('taskDelete').addEventListener('click', async () => {
  if (!selectedTaskId) return
  if (!confirm('¿Borrar esta tarea? No se puede deshacer.')) return
  try {
    await window.diary.deleteTask(selectedTaskId)
    closeTaskDetail()
    loadTasks()
  } catch (err) {
    console.error('[diary] no pude borrar la tarea:', err)
  }
})

document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!selectedTaskId) return
  const input = document.getElementById('commentInput')
  const texto = input.value.trim()
  if (!texto) return
  try {
    await window.diary.addComment(selectedTaskId, texto)
    input.value = ''
    loadComments(selectedTaskId)
  } catch (err) {
    console.error('[diary] no pude agregar el comentario:', err)
  }
})

document.getElementById('taskComments').addEventListener('click', async (e) => {
  const btn = e.target.closest('.comment-delete')
  if (!btn || !selectedTaskId) return
  try {
    await window.diary.deleteComment(selectedTaskId, btn.dataset.id)
    loadComments(selectedTaskId)
  } catch (err) {
    console.error('[diary] no pude borrar el comentario:', err)
  }
})

document.getElementById('flowEdgeForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const from = document.getElementById('flowFrom').value
  const to = document.getElementById('flowTo').value
  if (!from || !to) return
  if (flowEdges.some((ed) => ed.from === from && ed.to === to)) return
  flowEdges.push({ from, to })
  renderFlowEdges()
  await saveFlowEdges()
})

document.getElementById('flowEdgeList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.flow-edge-delete')
  if (!btn) return
  flowEdges.splice(Number(btn.dataset.i), 1)
  renderFlowEdges()
  await saveFlowEdges()
})

document.getElementById('flowReset').addEventListener('click', async () => {
  if (!flowEdges.length) return
  if (!confirm('¿Borrar todas las conexiones? La gata vuelve a su comportamiento de siempre.')) return
  flowEdges = []
  renderFlowEdges()
  await saveFlowEdges()
})

applyTheme(localStorage.getItem(THEME_KEY) || 'light')
loadAndRender()
