# La Jungla de los Números

Un videojuego educativo infantil para aprender los números, contar, sumar y restar jugando. Está pensado para niños de 4 a 7 años y funciona como una aplicación web estática: no requiere instalación de dependencias, servidor, conexión a internet ni compilación.

## Contenido

```text
la-jungla-de-los-numeros/
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Requisitos

- Visual Studio Code.
- Un navegador moderno (Chrome, Edge, Firefox o Safari).
- Opcional: la extensión **Live Server** de Visual Studio Code para recargar la página automáticamente mientras se desarrolla.

No se necesita C++ ni WebAssembly. El navegador ejecuta JavaScript de forma nativa, que es suficiente para toda la lógica de preguntas, respuestas, puntuación, desbloqueo y guardado. Incorporar WebAssembly añadiría compilación y configuración sin mejorar esta experiencia educativa.

## Ejecutar en Visual Studio Code

1. Abre en Visual Studio Code la carpeta que contiene estos archivos.
2. Abre `index.html`.
3. Para empezar inmediatamente, abre `index.html` en tu navegador. También puedes hacer clic derecho y elegir **Open with Live Server** si tienes instalada esa extensión.
4. Modifica `styles.css` para el diseño y `script.js` para las preguntas y reglas del juego. Guarda y vuelve a cargar la página.

La aplicación no necesita conexión a internet para jugar. La hoja de estilos incluye una tipografía alternativa del sistema por si no se puede descargar la fuente opcional de Google Fonts.

## Cómo jugar

- Pulsa **¡JUGAR!** para abrir el mapa.
- Completa los cinco retos de cada nivel y elige entre tres respuestas.
- Una respuesta equivocada invita a intentarlo de nuevo, sin quitar puntos ni bloquear el avance.
- Al terminar un nivel se reciben puntos y estrellas; los niveles 3, 6 y 10 también otorgan una medalla la primera vez que se completan.
- Los niveles se desbloquean en orden. Los niveles ya abiertos se pueden repetir.
- El progreso se conserva en el almacenamiento local del navegador.
- Las instrucciones y preguntas se leen automáticamente al entrar en cada reto; también se dicen con voz cariñosa los elogios, los mensajes de ánimo y las celebraciones. La música y los efectos alegres empiezan con la primera interacción; el botón **Audio** los activa o desactiva. Algunos navegadores requieren esa interacción para permitir sonido. **Reiniciar** borra el progreso después de pedir confirmación.
- En la pantalla inicial, toca los círculos, cuadrados y triángulos para aprender sus nombres y colores; el navegador los pronuncia cuando admite lectura en voz alta.
- En los retos de conteo, toca cada fruta una vez para contarla y desbloquear las respuestas. En números, busca primero el número en el camino; en sumas y restas, toca todas las frutas para agruparlas o quitarlas. La actividad se completa antes de habilitar las respuestas y se puede reiniciar para practicar otra vez. La lectura en voz alta requiere que el navegador admita voces en español; inicia la aventura con **¡JUGAR!** para permitir la reproducción automática.
- En los retos de números, explora el camino interactivo: cada número se resalta y se pronuncia. Los botones de respuesta se iluminan al completar la actividad visual, para guiar el aprendizaje paso a paso.
- Durante las preguntas, los animales guía cambian según el reto, el camino muestra el avance con iconos y las tarjetas y respuestas tienen animaciones de entrada y reacción.
- La pantalla de preguntas incluye una isla 3D grande con animales y plantas en una órbita lenta de 360 grados. La isla también responde suavemente al movimiento del cursor; es una ilusión panorámica hecha con CSS, no un entorno VR real, y respeta la opción de reducir movimiento del dispositivo.
- El panel de preguntas usa un acabado translúcido para integrarse visualmente con el fondo de la isla sin perder contraste en textos ni respuestas.
- El fondo muestra una jungla panorámica colorida con árboles, flores y varios animales animados. Se mueve suavemente con el cursor para dar una sensación envolvente de 360 grados; es un efecto 3D simulado con CSS, no un visor VR real, y no necesita WebGL ni hardware especial.
- El mono, las frutas, las respuestas, las estrellas y las medallas tienen animaciones breves; se respeta la preferencia del dispositivo para reducir movimiento.

## Los diez niveles

| Nivel | Actividad |
|---|---|
| 1 | Reconocer los números del 1 al 5 |
| 2 | Contar frutas |
| 3 | Reconocer los números del 1 al 10 |
| 4–5 | Sumas sencillas |
| 6–7 | Restas sencillas |
| 8–9 | Problemas matemáticos ilustrados |
| 10 | Desafío final con números, conteo, sumas y restas |

Cada nivel contiene cinco preguntas con tres opciones y una respuesta correcta. Las estrellas adicionales dependen de cuántas preguntas se respondieron correctamente al primer intento; volver a intentarlo no resta puntos.

## Accesibilidad y compatibilidad

La interfaz se adapta a celulares, tabletas y computadoras. Los controles son botones HTML nativos, utilizables con teclado, con foco visible y etiquetas accesibles. Los avisos de respuesta y conteo se anuncian a lectores de pantalla, la lectura automática usa la API del navegador cuando está disponible y se respeta la preferencia del sistema para reducir movimiento.

El progreso se guarda bajo la clave `junglaNumerosProgressV1` de `localStorage`. Para borrar manualmente los datos, usa el botón **Reiniciar** o limpia el almacenamiento del sitio desde el navegador.
