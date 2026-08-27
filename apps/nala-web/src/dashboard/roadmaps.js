// Contenido de la ruta de aprendizaje de After Effects, como datos, para
// renderizarlo nativo con el diseño de la app.
export const AE_ROADMAP = {
  eyebrow: 'Ruta de aprendizaje',
  title: 'De cero a experto en Motion UI con After Effects',
  lead: 'Una línea de tiempo con las etapas, canales, cursos y referencias reales que necesitás para animar branding de apps a nivel profesional.',
  steps: [
    { n: '01', tag: 'Fundamentos', title: 'Principios de animación y diseño', desc: 'Los 12 principios de Disney (timing, easing, anticipación, squash & stretch) más fundamentos de color, tipografía y composición. Sin esto, cualquier animación se ve amateur sin importar el software.', course: 'curso: Design Bootcamp — School of Motion' },
    { n: '02', tag: 'Software', title: 'Dominar la interfaz de After Effects', desc: 'Keyframes, Graph Editor, máscaras, mattes, null objects, parenting, Shape Layers y expresiones básicas (loopOut, wiggle, time).', course: 'curso: Ukramedia (gratis, YouTube) + Editucation.io Módulo 1 “Foundation”' },
    { n: '03', tag: 'Refinamiento', title: 'Easing y curvas de animación', desc: 'El 80% de que algo “se sienta profesional” está en el easing. Domina el Graph Editor: ease in/out, overshoot, bounce.', course: 'curso: Animation Bootcamp — School of Motion (el módulo de Graph Editor es el mejor que existe)' },
    {
      n: '04', tag: 'Especialización', title: 'Motion UI para apps', desc: 'Micro-interacciones, botones, loaders, transiciones entre pantallas, onboarding. Exportación a Lottie/Bodymovin para integrarlo en apps reales sin perder calidad ni peso.', course: 'curso: UI/UX Motion Design — Motion Design School',
      micro: {
        title: 'Micro-interacciones que debés dominar',
        items: [
          ['Estados de botón', 'idle, hover, pressed, disabled, loading (nunca un cambio brusco, siempre easing de 100–200ms)'],
          ['Feedback de acción', 'like, guardar, enviar: un pequeño “pop” con overshoot dice “esto funcionó” sin texto'],
          ['Loaders y skeletons', 'shimmer o pulso mientras carga, para que la espera no se sienta muerta'],
          ['Pull-to-refresh', 'resistencia elástica al arrastrar, snap-back con spring al soltar'],
          ['Transiciones de pantalla', 'shared element transition (un elemento “viaja” entre vistas en vez de cortar)'],
          ['Toasts y errores', 'entrada rápida, salida con delay; el error nunca debe sentirse agresivo'],
          ['Onboarding', 'revelar contenido en secuencia (stagger), nunca todo de golpe']
        ],
        note: 'Regla de oro: la mayoría de micro-interacciones deben durar entre 100–300ms. Más de 400ms se siente lento; menos de 80ms no se percibe.'
      }
    },
    { n: '05', tag: 'Branding', title: 'Sistemas de identidad animada', desc: 'Logo stinger, paleta de transiciones, tipografía en movimiento, iconografía consistente. Lo que arma un “kit de marca” animado real.', course: 'curso: Motion Graphics y Branding — Domestika (español)' },
    { n: '06', tag: 'Herramientas', title: 'Software complementario', desc: 'Illustrator/Photoshop para assets vectoriales limpios, Cinema 4D o Blender (+Cineware) para 3D, Figma para diseñar las pantallas que vas a animar.', course: 'curso: canal EJ Hassenfratz (gratis) para la integración Cinema 4D + AE' },
    { n: '07', tag: 'Práctica', title: 'Proyectos y portafolio', desc: 'Recreá animaciones de apps conocidas como ejercicio, luego creá 3–5 proyectos propios. Subí todo a Behance/Dribbble/Instagram.', course: 'referencia: estudiá el portafolio de creatoroly.com' },
    { n: '08', tag: 'Comunidad', title: 'Feedback y actualización constante', desc: 'Comunidades activas de motion design donde el feedback de otros animadores acelera tu curva de aprendizaje.', course: '' }
  ],
  advanced: [
    { n: '09', tag: 'Sistema', title: 'Diseñá con tokens de movimiento, no animaciones sueltas', desc: 'Un sistema de motion serio define constantes reutilizables: duraciones estándar (150/250/400ms), 2–3 curvas de easing con nombre (standard, emphasized, spring) y reglas de cuándo usar cada una. Así toda la marca se mueve con la misma personalidad.', course: 'referencia: “Material Design motion system” y “Apple HIG motion guidelines”' },
    { n: '10', tag: 'Expresiones avanzadas', title: 'Rigs y animación dirigida por matemáticas', desc: 'Expresiones de spring físico (overshoot realista sin animar a mano), rigs con controladores maestros para animar familias de elementos, y valueAtTime() para efectos de arrastre entre capas. Te permite iterar rápido en proyectos grandes.', course: 'curso: canal Mikey Borup (gratis) — el mejor recurso en expresiones avanzadas' },
    { n: '11', tag: 'Micro-interacciones a fondo', title: 'Física de resorte y timing perceptual', desc: 'Más allá del easing estándar: parámetros de spring (stiffness, damping, mass) como en Framer Motion / Lottie, micro-interacciones “táctiles” con haptics en el dev handoff, y stagger para que listas y grids se sientan vivas.', course: 'curso: Editucation.io — Módulo 2 “UI Animation That Actually Works”' },
    { n: '12', tag: 'Referencia pro', title: 'Estudiá trabajo de estudios y freelancers de alto nivel', desc: 'creatoroly.com es un buen ejemplo: un motion designer freelance que muestra conceptos de apps (fintech, iOS) con estética “Apple-coded” y vende sus .aep como producto. Desarmar sus composiciones vale más que otro tutorial.', course: 'recurso: creatoroly.com/assets — packs de proyecto reales' },
    { n: '13', tag: '3D y profundidad', title: 'Motion branding con profundidad real', desc: 'Integrá Cinema 4D o Blender vía Cineware para logos con luz, sombra y cámara reales — la diferencia entre motion 2D plano y el look “premium” de las marcas tech grandes. Cámaras animadas, profundidad de campo y mezclar 3D con capas 2D.', course: 'curso: canal EJ Hassenfratz + Cinema 4D en Domestika' },
    { n: '14', tag: 'Negocio', title: 'De “sé usar After Effects” a cobrar tarifas premium', desc: 'Un estilo técnico sólido no basta: necesitás una estética firmable, una estrategia de portafolio pensada para conseguir clientes, y saber posicionar precio. La etapa que casi nadie enseña gratis.', course: 'curso: Editucation.io — Módulo 5 “Positioning & Getting Hired”' }
  ],
  channels: [
    { kicker: 'General · referencia mundial', name: 'School of Motion', desc: 'El canal más citado de la industria. Fundamentos sólidos de animación y motion graphics.' },
    { kicker: 'UI/UX específico', name: 'Ukramedia (Nol)', desc: 'Tutoriales enfocados en UI/UX motion design y expresiones avanzadas en AE.' },
    { kicker: 'Personajes y UI', name: 'Motion Design School', desc: 'Animación de personajes y motion para producto, con calidad de estudio.' },
    { kicker: '3D + AE', name: 'EJ Hassenfratz', desc: 'Integración de Cinema 4D con After Effects para branding con profundidad 3D.' },
    { kicker: 'Expresiones avanzadas', name: 'Mikey Borup', desc: 'Expresiones y rigs automatizados en AE para acelerar tu flujo.' },
    { kicker: 'Motion graphics general', name: 'Sonduck Films', desc: 'Edición y motion graphics aplicados a proyectos reales de video.' }
  ],
  courses: [
    { badge: 'pago', name: 'Animation Bootcamp', desc: 'School of Motion · el curso de referencia para dominar principios de animación en AE.', link: 'schoolofmotion.com' },
    { badge: 'pago', name: 'Design Bootcamp', desc: 'School of Motion · fundamentos de diseño aplicados a motion, antes de animar.', link: 'schoolofmotion.com' },
    { badge: 'pago', name: 'UI/UX Motion Design', desc: 'Motion Design School · curso específico para animar interfaces y apps.', link: 'motiondesign.school' },
    { badge: 'pago · español', name: 'Cursos de Motion Graphics', desc: 'Domestika · buena relación precio/calidad, branding animado en español.', link: 'domestika.org' },
    { badge: 'pago · económico', name: 'Catálogo general de motion', desc: 'Skillshare · variedad amplia, calidad desigual pero útil para explorar estilos.', link: 'skillshare.com' },
    { badge: 'gratis / recursos', name: 'Blog y tutoriales Lottie', desc: 'LottieFiles · cómo crear, optimizar e integrar animaciones en apps reales.', link: 'lottiefiles.com' },
    { badge: 'avanzado · pago', name: 'Editucation.io', desc: 'Sistema de motion “estilo Apple” para UI: fundamentos, estilo firmable y cómo cobrar premium. $49/mes o $249 de por vida.', link: 'editucation.io' },
    { badge: 'avanzado · referencia', name: 'Creatoroly', desc: 'Portafolio y .aep de un freelance con estética Apple-coded en apps. Para desarmar composiciones reales.', link: 'creatoroly.com' }
  ],
  brands: [
    { key: 'spotify', name: 'Spotify', desc: 'Transiciones de color y morphing orgánico entre campañas (Wrapped es el caso obligado).', search: '“Spotify Wrapped motion design case study”' },
    { key: 'bk', name: 'Burger King', desc: 'Rebrand 2021: motion retro, geométrico y juguetón, con transiciones tipo stop-motion.', search: '“Burger King 2021 rebrand motion identity”' },
    { key: 'duo', name: 'Duolingo', desc: 'Micro-interacciones de celebración y personalidad de mascota — top en Motion UI de producto.', search: '“Duolingo micro-interaction animation breakdown”' },
    { key: 'netflix', name: 'Netflix', desc: 'El intro sonoro-visual más reconocible del streaming; marca a partir de un solo gesto.', search: '“Netflix tudum intro motion branding”' },
    { key: 'airbnb', name: 'Airbnb', desc: 'Morphing sutil del símbolo Bélo en transiciones de producto y campañas.', search: '“Airbnb Bélo motion identity”' },
    { key: 'slack', name: 'Slack', desc: 'Sistema de color modular animado en loaders y transiciones de la interfaz.', search: '“Slack loading animation motion system”' }
  ],
  community: [
    { kicker: 'Reddit', name: 'r/AfterEffects · r/motiondesign', desc: 'Feedback técnico y de estilo de otros animadores.' },
    { kicker: 'Discord', name: 'Motion Design Club', desc: 'Comunidad activa con retos y crítica de proyectos.' },
    { kicker: 'Redes', name: '#motiondesign #uianimation', desc: 'Seguí estos hashtags en Instagram/X para ver el proceso de los mejores.' },
    { kicker: 'Inspiración', name: 'Dribbble · Behance · Mobbin', desc: 'Buscá “app onboarding animation” o “logo animation” para referencias directas.' }
  ],
  note: 'No saltes entre 10 recursos a la vez: un canal gratis para lo básico + un curso pagado cuando quieras estructura, más práctica constante, alcanza para arrancar fuerte.'
}
