# Adding a work

Each directory directly inside `works/` is an independent experience. Keep the convention small so a work can choose the implementation that suits it.

## Directory contract

- **Name:** use a short, unique, lowercase kebab-case slug, for example `quiet-garden`.
- **Entry point:** include a browser-ready `index.html` at `works/<slug>/index.html`. A compiled work should place its built output here.
- **Assets:** keep work-specific images, audio, models, and other files inside the work directory, organized as needed. Use URLs that resolve from the work's deployed path.
- **Direct URL:** the root build copies this directory to `dist/works/<slug>/`. Static hosts that serve directory index files should make it available at `/works/<slug>/`; verify that the page and its assets load from that URL.
- **Device support:** state whether the work supports mobile, desktop, or both, and describe any meaningful limitations in the work's own notes or interface.
- **Audio:** state whether sound is used and whether it is optional or required. Explain how to enable it; do not rely on autoplay with sound.
- **Return path:** provide a visible link back to Fril Studio, using a path that works from the deployed work URL.
- **Rights and attribution:** include work-specific third-party asset licenses, sources, attributions, and modifications. Original creative content remains outside the repository's MIT source license unless explicitly licensed otherwise.

Works can use plain HTML/CSS/JavaScript, GSAP, Three.js, Canvas, WebGL, React, or another suitable browser technology. They do not need to share the studio's framework or visual style. If a work needs dependencies or compilation, manage those within its own directory and place the browser-ready result there; the root project does not bundle work dependencies together.

## Running the Fold8 Blender generator

Open `works/001-galaxy-z-fold8/assets/model/source/build_fold8.py` in Blender's
Text Editor and run this in the Python Console to set the model output path:

```python
import bpy
import os
from pathlib import Path

source = Path(bpy.path.abspath(bpy.data.texts["build_fold8.py"].filepath))
os.environ["FRIL_FOLD8_MODEL_ROOT"] = str(source.resolve().parent.parent)
```

Then choose **Scripting > Python Run**.
