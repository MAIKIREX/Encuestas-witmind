# Importación de Raven — Escala General

Coloca aquí exclusivamente archivos para los que la organización tenga licencia de digitalización. No subas ni confirmes en Git el cuadernillo, las láminas recortadas ni la clave de corrección.

Estructura esperada:

```text
raven-import/
  clave.json
  A01_stem.png
  A01_opt_1.png
  A01_opt_2.png
  …
  E12_stem.png
  E12_opt_8.png
```

`clave.json` debe tener exactamente las claves `A01` a `E12`; cada valor es el número de alternativa correcta. Verifica esa clave contra el manual oficial, no contra la hoja de cálculo de corrección masiva.

Para validar y cargar:

```powershell
npm run import:raven
```

También puedes indicar otra carpeta:

```powershell
npm run import:raven -- --input C:\ruta\a\raven-import
```

El comando valida todos los archivos antes de modificar la base de datos. La prueba queda inactiva y conserva el orden original de ítems y alternativas. Si se interrumpe, volver a ejecutarlo actualiza los mismos ítems identificados por su código.
