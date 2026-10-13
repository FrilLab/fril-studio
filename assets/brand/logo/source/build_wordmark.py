#!/usr/bin/env python3
"""Build the editable FrilStudio hero wordmark and export its web GLB."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy


MODEL_DIR = Path(__file__).resolve().parent.parent
SOURCE_DIR = MODEL_DIR / "source"
EXPORT_DIR = MODEL_DIR / "exported"
INSPECTION_DIR = MODEL_DIR / "inspection"
BLEND_PATH = SOURCE_DIR / "frilstudio.blend"
GLB_PATH = EXPORT_DIR / "frilstudio.glb"
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Didot.ttc")

BLUE = (0.09, 0.26, 0.51, 1.0)
GOLD = (0.58, 0.42, 0.19, 1.0)
INK = (0.025, 0.045, 0.075, 1.0)


def material(name: str, color: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = 0.0
    return mat


def make_text(name: str, text: str, font: bpy.types.VectorFont, mat: bpy.types.Material, size: float, x: float, outline: bool = False) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}_Typography", "FONT")
    curve.body = text
    curve.font = font
    curve.size = size
    curve.space_character = 1.0
    curve.extrude = 0.034 if not outline else 0.046
    curve.bevel_depth = 0.007 if not outline else 0.009
    curve.bevel_resolution = 2
    curve.resolution_u = 6
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = (x, 0.0, 0.0)
    obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.select_set(False)
    return obj


def setup_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 560
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.world.color = (0.025, 0.035, 0.06)
    scene.camera.data.type = "ORTHO"
    scene.camera.data.ortho_scale = 6.2
    scene.camera.location = (0.0, -8.0, 1.0)
    scene.camera.rotation_euler = (math.radians(90), 0, 0)
    scene.camera.data.lens = 50
    scene.collection.objects.link(scene.camera)
    for name, location, power, size in (
        ("Key softbox", (-3.2, -4.5, 5.0), 430, 4.0),
        ("Fill softbox", (3.5, -2.8, 2.0), 250, 3.5),
        ("Edge softbox", (0.0, 2.0, 3.3), 360, 2.5),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = power
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        light.location = location
        light.rotation_euler = (math.radians(25), 0.0, math.radians(15))
        scene.collection.objects.link(light)


def main() -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    INSPECTION_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    if not FONT_PATH.exists():
        raise FileNotFoundError(f"Expected Didot font at {FONT_PATH}")
    font = bpy.data.fonts.load(str(FONT_PATH))
    blue = material("Fril • deep blue enamel", BLUE, 0.38)
    gold = material("Studio • muted gold enamel", GOLD, 0.4)
    ink = material("Fine edge • midnight ink", INK, 0.45)
    root = bpy.data.objects.new("FrilStudioLogoRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.1
    bpy.context.scene.collection.objects.link(root)

    # Didot's high-contrast serif silhouette carries the formal direction.
    # A very fine ink-colored backing keeps the face legible in 3D without
    # the heavy cartoon outline used by the earlier rounded wordmark.
    fril_outline = make_text("Fril_Outline", "Fril", font, ink, 0.88, 0.0, True)
    fril_outline.scale = (1.012, 1.012, 1.0)
    fril_outline.location.y = 0.018
    fril = make_text("Fril_Blue", "Fril", font, blue, 0.88, 0.0)
    fril_width = fril.dimensions.x
    gap = 0.055
    studio_x = fril_width + 0.05
    studio_outline = make_text("Studio_Outline", "Studio", font, ink, 0.88, studio_x, True)
    studio_outline.scale = (1.012, 1.012, 1.0)
    studio_outline.location.y = 0.018
    studio = make_text("Studio_Gold", "Studio", font, gold, 0.88, studio_x + gap)

    for obj in (fril_outline, fril, studio_outline, studio):
        obj.parent = root
        # The text's baseline is lifted slightly so it centers around world Z=0.
        obj.location.z = -0.36
    # Text is intentionally created in one plane and centered as a whole.
    bounds = [obj.matrix_world.translation.x for obj in (fril, studio)]
    total_width = max(studio.location.x + studio.dimensions.x, fril.dimensions.x)
    for obj in (fril_outline, fril, studio_outline, studio):
        obj.location.x -= total_width / 2.0
    # Put the colored faces in front of their larger dark backing.
    for obj in (fril, studio):
        obj.location.y -= 0.009

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 560
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.world.color = (0.025, 0.035, 0.06)
    camera_data = bpy.data.cameras.new("Wordmark_Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 4.8
    camera = bpy.data.objects.new("Wordmark_Camera", camera_data)
    camera.location = (0.0, -7.0, 0.25)
    camera.rotation_euler = (math.radians(90), 0.0, 0.0)
    scene.collection.objects.link(camera)
    scene.camera = camera
    for name, loc, energy, size in (
        ("Key softbox", (-3.0, -4.0, 4.0), 450, 3.5),
        ("Fill softbox", (3.0, -2.5, 1.4), 260, 3.0),
        ("Edge softbox", (0.0, 2.0, 3.0), 350, 2.5),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        light.location = loc
        light.rotation_euler = (math.radians(25), 0.0, 0.0)
        scene.collection.objects.link(light)

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        use_selection=False,
    )
    scene.render.filepath = str(INSPECTION_DIR / "frilstudio-wordmark.png")
    bpy.ops.render.render(write_still=True)
    stats = {
        "asset": "FrilStudio wordmark",
        "source_svg": "../source/frilstudio.svg",
        "font_source": str(FONT_PATH),
        "glb": str(GLB_PATH.relative_to(MODEL_DIR)),
        "objects": [obj.name for obj in bpy.context.scene.objects if obj.type == "MESH"],
        "triangles": sum(len(poly.vertices) - 2 for obj in bpy.context.scene.objects if obj.type == "MESH" for poly in obj.data.polygons),
        "materials": [mat.name for mat in bpy.data.materials],
    }
    (INSPECTION_DIR / "validation.json").write_text(json.dumps(stats, indent=2) + "\n")
    bpy.ops.wm.quit_blender()


if __name__ == "__main__":
    main()
