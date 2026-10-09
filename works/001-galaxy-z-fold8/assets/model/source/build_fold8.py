#!/usr/bin/env python3
"""Build the Fril Studio Galaxy Z Fold8 exterior concept asset.

Run with Blender 4.5 or newer:
    blender --background --python source/build_fold8.py

This command-line invocation is the canonical reproducible workflow. To run
the script from Blender's Text Editor, first set the root from Blender's
Python Console (with build_fold8.py open as an external text):

    import bpy, os
    from pathlib import Path
    source = Path(bpy.path.abspath(bpy.data.texts["build_fold8.py"].filepath))
    os.environ["FRIL_FOLD8_MODEL_ROOT"] = str(source.resolve().parent.parent)

Then run the text. The environment variable is only needed for that Blender
session; command-line execution resolves the root directly from this file.

All dimensions are authored in meters. The main leaf is the moving leaf in the
validation fold; LeftBodyPivot and RightBodyPivot are both hinge-centered and
can be rotated independently by a runtime consumer.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def resolve_model_root(script_file: str | os.PathLike[str] | None = None) -> Path:
    """Find the existing model directory without ever falling back to '/'."""
    if script_file is None:
        script_file = globals().get("__file__")

    if script_file:
        try:
            script_path = Path(script_file).expanduser().resolve(strict=True)
        except (OSError, RuntimeError, ValueError):
            script_path = None

        if script_path is not None and script_path.is_file():
            candidate = script_path.parent.parent
            source_dir = candidate / "source"
            if (
                candidate != candidate.parent
                and candidate.is_dir()
                and source_dir.is_dir()
                and source_dir.resolve() == script_path.parent
            ):
                return candidate

    env_root = os.environ.get("FRIL_FOLD8_MODEL_ROOT")
    if env_root:
        try:
            candidate = Path(env_root).expanduser().resolve()
        except (OSError, RuntimeError, ValueError) as error:
            raise RuntimeError(
                "FRIL_FOLD8_MODEL_ROOT must point to an existing Fold8 model "
                "directory containing source/."
            ) from error

        if (
            candidate != candidate.parent
            and candidate.is_dir()
            and (candidate / "source").is_dir()
        ):
            return candidate

        raise RuntimeError(
            "FRIL_FOLD8_MODEL_ROOT must point to an existing Fold8 model "
            "directory containing source/. No output directories were created."
        )

    raise RuntimeError(
        "Cannot determine Fold8 model root. Run build_fold8.py as an external "
        "file from its source/ directory, or set FRIL_FOLD8_MODEL_ROOT to the "
        "existing works/001-galaxy-z-fold8/assets/model directory. "
        "No output directories were created."
    )


MODEL_DIR = resolve_model_root()
SCRIPT_DIR = MODEL_DIR / "source"
EXPORT_DIR = MODEL_DIR / "exported"
INSPECTION_DIR = MODEL_DIR / "inspection"
BLEND_PATH = SCRIPT_DIR / "galaxy-z-fold8.blend"
GLB_PATH = EXPORT_DIR / "galaxy-z-fold8.glb"

# Official Samsung exterior dimensions, converted from millimeters to meters.
WIDTH_OPEN = 0.1614
HEIGHT = 0.1239
THICKNESS_OPEN = 0.0045
WIDTH_FOLDED = 0.0819
THICKNESS_FOLDED = 0.0097
HALF_WIDTH = WIDTH_OPEN / 2.0
# Reference-view layout: the camera-bearing LeftBody sits at +X so it appears
# on the viewer's left when the rear face is viewed from -Z. RightBody sits at
# -X and carries the opposite outer cover display.
LEFT_BODY_CENTER_X = HALF_WIDTH / 2.0
RIGHT_BODY_CENTER_X = -HALF_WIDTH / 2.0

FRAME_DEPTH = 0.00438
SCREEN_LIFT = THICKNESS_OPEN - FRAME_DEPTH
MAIN_ASPECT = 4.0 / 3.0
MAIN_DIAGONAL = 0.1932
MAIN_SCREEN_HEIGHT = MAIN_DIAGONAL * 3.0 / 5.0
MAIN_SCREEN_WIDTH = MAIN_SCREEN_HEIGHT * MAIN_ASPECT
COVER_DIAGONAL = 0.1384
COVER_ASPECT = 10.0 / 16.0
COVER_SCREEN_HEIGHT = COVER_DIAGONAL / math.sqrt(1.0 + COVER_ASPECT**2)
COVER_SCREEN_WIDTH = COVER_SCREEN_HEIGHT * COVER_ASPECT


def set_active(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def make_material(name: str, color: tuple[float, float, float], metallic: float, roughness: float) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return material


def make_empty(name: str, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.004
    if parent:
        obj.parent = parent
        obj.location = (0.0, 0.0, 0.0)
    return obj


def round_rect_points(
    width: float,
    height: float,
    radius: float | tuple[float, float, float, float],
    segments: int = 6,
) -> list[tuple[float, float]]:
    """Return a rounded rectangle, with optional per-corner radii.

    Tuple order follows the point loop: bottom-right, top-right, top-left,
    bottom-left. This lets each leaf keep its hinge edge nearly square while
    retaining a larger radius on its exposed outside corners.
    """
    radii = (radius,) * 4 if isinstance(radius, (float, int)) else radius
    if len(radii) != 4:
        raise ValueError("A rounded rectangle needs one radius or four corner radii")
    corners = [
        (width / 2.0, -height / 2.0, -90.0, 0.0),
        (width / 2.0, height / 2.0, 0.0, 90.0),
        (-width / 2.0, height / 2.0, 90.0, 180.0),
        (-width / 2.0, -height / 2.0, 180.0, 270.0),
    ]
    points = []
    for (corner_x, corner_y, start, end), corner_radius in zip(corners, radii):
        corner_radius = min(corner_radius, width / 2.0 - 1e-7, height / 2.0 - 1e-7)
        cx = corner_x - math.copysign(corner_radius, corner_x)
        cy = corner_y - math.copysign(corner_radius, corner_y)
        for index in range(segments + 1):
            angle = math.radians(start + (end - start) * index / segments)
            points.append((cx + corner_radius * math.cos(angle), cy + corner_radius * math.sin(angle)))
    return points


def leaf_corner_radii(is_left: bool, outside: float, hinge_side: float) -> tuple[float, float, float, float]:
    """Radii in bottom-right, top-right, top-left, bottom-left order."""
    if is_left:
        return (hinge_side, hinge_side, outside, outside)
    return (outside, outside, hinge_side, hinge_side)


def make_prism(
    name: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    z_min: float,
    z_max: float,
    radius: float | tuple[float, float, float, float],
    material: bpy.types.Material,
    parent: bpy.types.Object,
    edge_bevel: float = 0.0,
    segments: int = 6,
) -> bpy.types.Object:
    points = round_rect_points(width, height, radius, segments=segments)
    count = len(points)
    cx, cy, _ = center
    vertices = [(cx + x, cy + y, z_min) for x, y in points]
    vertices += [(cx + x, cy + y, z_max) for x, y in points]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, next_index + count, index + count))

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    mesh.validate(clean_customdata=True)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    if edge_bevel > 0.0:
        bevel = obj.modifiers.new("Edge highlight bevel", "BEVEL")
        bevel.width = edge_bevel
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(25.0)
        bevel.harden_normals = True
        normal = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        normal.keep_sharp = True
    return obj


def make_box(
    name: str,
    center: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    parent: bpy.types.Object,
    bevel_width: float = 0.0,
    bevel_segments: int = 3,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    set_active(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    obj.location = center
    obj.data.materials.append(material)
    if bevel_width > 0.0:
        bevel = obj.modifiers.new("Soft machined edges", "BEVEL")
        bevel.width = bevel_width
        bevel.segments = bevel_segments
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(25.0)
        bevel.harden_normals = True
        obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return obj


def make_cylinder(
    name: str,
    center: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    vertices: int = 48,
    bevel_width: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    obj.parent = parent
    obj.location = center
    if bevel_width > 0.0:
        bevel = obj.modifiers.new("Lens edge glint", "BEVEL")
        bevel.width = bevel_width
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        obj.modifiers.new("Lens weighted normals", "WEIGHTED_NORMAL")
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return obj


def make_screen_surface(
    name: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    radius: float | tuple[float, float, float, float],
    material: bpy.types.Material,
    parent: bpy.types.Object,
    back_facing: bool = False,
) -> bpy.types.Object:
    points = round_rect_points(width, height, radius, segments=8)
    cx, cy, z = center
    vertices = [(cx + x, cy + y, z) for x, y in points]
    order = tuple(reversed(range(len(points)))) if back_facing else tuple(range(len(points)))
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], [order])
    mesh.materials.append(material)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="ScreenUV")
    for loop_index, vertex_index in enumerate(order):
        x, y = points[vertex_index]
        uv_layer.data[loop_index].uv = ((x + width / 2.0) / width, (y + height / 2.0) / height)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def add_round_hole(
    name: str,
    x: float,
    y: float,
    z: float,
    radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    normal: str = "z",
) -> bpy.types.Object:
    obj = make_cylinder(name, (x, y, z), radius, 0.00012, material, parent, vertices=32)
    if normal == "negative_y":
        obj.rotation_euler.x = math.radians(90.0)
    elif normal == "positive_y":
        obj.rotation_euler.x = math.radians(-90.0)
    return obj


def look_at(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    forward = (Vector(target) - camera.location).normalized()
    world_up = Vector((0.0, 1.0, 0.0))
    if abs(forward.dot(world_up)) > 0.999:
        world_up = Vector((0.0, 0.0, 1.0))
    right = forward.cross(world_up).normalized()
    up = right.cross(forward).normalized()
    camera_basis = Matrix((right, up, -forward)).transposed()
    camera.rotation_euler = camera_basis.to_euler()


def bounds_for(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return (
        Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners))),
        Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners))),
    )


def bounds_dimensions(objects: list[bpy.types.Object]) -> tuple[float, float, float]:
    low, high = bounds_for(objects)
    return (high.x - low.x, high.y - low.y, high.z - low.z)


def set_fold(left_pivot: bpy.types.Object, right_pivot: bpy.types.Object, degrees: float) -> None:
    # The left leaf flips over the stationary right leaf. Both pivots share the
    # same hinge axis, and the right pivot remains independently addressable.
    left_pivot.rotation_euler.y = math.radians(degrees)
    right_pivot.rotation_euler.y = 0.0
    bpy.context.view_layer.update()


def assert_close(label: str, actual: float, expected: float, tolerance: float) -> None:
    if abs(actual - expected) > tolerance:
        raise AssertionError(f"{label}: got {actual * 1000:.3f} mm, expected {expected * 1000:.3f} mm")


def render_inspection(
    root: bpy.types.Object,
    left_pivot: bpy.types.Object,
    right_pivot: bpy.types.Object,
    camera_x: float,
) -> list[str]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.curvature_ridge_factor = 1.35
    scene.display.shading.curvature_valley_factor = 1.0
    scene.display.shading.show_shadows = False
    scene.display.shading.background_type = "WORLD"
    scene.world.color = (0.045, 0.05, 0.06)

    camera_data = bpy.data.cameras.new("InspectionCameraData")
    camera = bpy.data.objects.new("InspectionCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 0.205
    camera.data.clip_start = 0.001
    camera.data.clip_end = 2.0

    render_specs = [
        ("01-unfolded-front.png", 0.0, (0.0, 0.0, 0.25), (0.0, 0.0, 0.0), 0.205),
        ("02-unfolded-rear.png", 0.0, (0.0, 0.0, -0.25), (0.0, 0.0, 0.0), 0.205),
        ("03-folded-front.png", 180.0, (0.0, 0.0, -0.25), (-0.039, 0.0, 0.0), 0.205),
        ("04-folded-rear.png", 180.0, (0.0, 0.0, 0.25), (-0.039, 0.0, 0.0), 0.205),
        ("05-fold-90.png", 90.0, (0.19, 0.075, 0.22), (0.0, 0.0, 0.0), 0.205),
        ("06-hinge-side.png", 45.0, (-0.19, 0.025, -0.13), (0.0, 0.0, 0.0), 0.205),
        (
            "07-rear-camera-close.png", 0.0,
            (camera_x, 0.082, -0.140), (camera_x, 0.028, -0.0045), 0.080,
        ),
        (
            "08-hinge-corner-close.png", 0.0,
            (-0.025, 0.072, 0.095), (0.0, 0.055, 0.0002), 0.050,
        ),
    ]
    outputs = []
    for filename, degrees, position, target, ortho_scale in render_specs:
        set_fold(left_pivot, right_pivot, degrees)
        camera.data.ortho_scale = ortho_scale
        camera.location = position
        look_at(camera, target)
        output = INSPECTION_DIR / filename
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        outputs.append(str(output.relative_to(MODEL_DIR)))

    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(camera_data)
    scene.camera = None
    return outputs


def main() -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    INSPECTION_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.film_transparent = False

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    graphite_frame = make_material("Graphite_Frame", (0.16, 0.17, 0.19), 0.78, 0.27)
    graphite_panel = make_material("Graphite_Rear_Panel", (0.105, 0.112, 0.128), 0.28, 0.34)
    hinge_metal = make_material("Hinge_Metal", (0.19, 0.20, 0.22), 0.82, 0.25)
    display_glass = make_material("Display_Glass", (0.012, 0.014, 0.018), 0.22, 0.20)
    screen_surface = make_material("Screen_Surface", (0.003, 0.005, 0.009), 0.04, 0.20)
    camera_ring = make_material("Camera_Ring", (0.26, 0.28, 0.31), 0.88, 0.22)
    camera_glass = make_material("Camera_Lens_Glass", (0.012, 0.025, 0.044), 0.52, 0.14)
    flash_material = make_material("Flash_Diffuser", (0.76, 0.72, 0.59), 0.08, 0.3)
    black_detail = make_material("Ports_And_Details", (0.008, 0.009, 0.011), 0.25, 0.32)

    root = make_empty("GalaxyZFold8")
    root["asset_note"] = "Unofficial Fril Studio interactive concept model"
    hinge_root = make_empty("HingeRoot", root)
    left_pivot = make_empty("LeftBodyPivot", hinge_root)
    right_pivot = make_empty("RightBodyPivot", hinge_root)
    left_body = make_empty("LeftBody", left_pivot)
    right_body = make_empty("RightBody", right_pivot)
    hinge = make_empty("Hinge", hinge_root)
    left_pivot["runtime_axis"] = "Local Y through the hinge center"
    right_pivot["runtime_axis"] = "Local Y through the hinge center"

    # Chassis: each half ends at the hinge axis. The product outline therefore
    # measures exactly 161.4 x 123.9 x 4.5 mm when unfolded.
    outer_corner_radius = 0.0042
    hinge_corner_radius = 0.0006
    left_frame = make_prism(
        "LeftFrame", (LEFT_BODY_CENTER_X, 0.0, 0.0), HALF_WIDTH, HEIGHT,
        -FRAME_DEPTH, 0.0, leaf_corner_radii(False, outer_corner_radius, hinge_corner_radius),
        graphite_frame, left_body, edge_bevel=0.00018,
    )
    right_frame = make_prism(
        "RightFrame", (RIGHT_BODY_CENTER_X, 0.0, 0.0), HALF_WIDTH, HEIGHT,
        -FRAME_DEPTH, 0.0, leaf_corner_radii(True, outer_corner_radius, hinge_corner_radius),
        graphite_frame, right_body, edge_bevel=0.00018,
    )

    # Thin, inset graphite rear panels on both leaves.
    make_prism(
        "RearPanel_Left", (LEFT_BODY_CENTER_X, 0.0, 0.0), 0.0786, 0.1218,
        -FRAME_DEPTH - 0.000015, -FRAME_DEPTH + 0.000035,
        leaf_corner_radii(False, 0.0040, 0.00055),
        graphite_panel, left_body,
    )
    make_prism(
        "RearPanel_Right", (RIGHT_BODY_CENTER_X, 0.0, 0.0), 0.0786, 0.1218,
        -FRAME_DEPTH - 0.000015, -FRAME_DEPTH + 0.000035,
        leaf_corner_radii(True, 0.0040, 0.00055),
        graphite_panel, right_body,
    )

    # Main display border and independently replaceable active surfaces.
    seam_gap = 0.00016
    half_active = (MAIN_SCREEN_WIDTH - seam_gap) / 2.0
    left_screen_center_x = seam_gap / 2.0 + half_active / 2.0
    right_screen_center_x = -seam_gap / 2.0 - half_active / 2.0
    main_bezel_width = HALF_WIDTH - 0.0008
    main_bezel_height = HEIGHT - 0.0024
    for name, center_x, body, is_left in [
        ("Left", LEFT_BODY_CENTER_X, left_body, False),
        ("Right", RIGHT_BODY_CENTER_X, right_body, True),
    ]:
        make_prism(
            f"Bezel_Main_{name}", (center_x, 0.0, 0.0), main_bezel_width, main_bezel_height,
            0.000015, 0.000075,
            leaf_corner_radii(is_left, 0.0040, 0.00055), display_glass, body,
        )
    main_corner_radii_left = leaf_corner_radii(False, 0.0040, 0.00055)
    main_corner_radii_right = leaf_corner_radii(True, 0.0040, 0.00055)
    make_screen_surface(
        "Screen_Main_Left", (left_screen_center_x, 0.0, SCREEN_LIFT), half_active,
        MAIN_SCREEN_HEIGHT, main_corner_radii_left, screen_surface, left_body,
    )
    make_screen_surface(
        "Screen_Main_Right", (right_screen_center_x, 0.0, SCREEN_LIFT), half_active,
        MAIN_SCREEN_HEIGHT, main_corner_radii_right, screen_surface, right_body,
    )

    # Cover display is a separate runtime surface on the right leaf's outside.
    cover_center_x = RIGHT_BODY_CENTER_X
    cover_bezel_width = COVER_SCREEN_WIDTH + 0.0042
    cover_bezel_height = COVER_SCREEN_HEIGHT + 0.0030
    make_screen_surface(
        "Bezel_Cover", (cover_center_x, 0.0, -FRAME_DEPTH - 0.000025),
        cover_bezel_width, cover_bezel_height, 0.0052, display_glass, right_body,
        back_facing=True,
    )
    make_screen_surface(
        "Screen_Cover", (cover_center_x, 0.0, -FRAME_DEPTH - 0.00004),
        COVER_SCREEN_WIDTH, COVER_SCREEN_HEIGHT, 0.0046, screen_surface, right_body,
        back_facing=True,
    )

    # Rear dual-camera island and lenses are separate semantic objects.
    camera_assembly = make_empty("CameraAssembly", left_body)
    camera_x = 0.0625
    camera_module_center_y = 0.0280
    camera_y_top = 0.0410
    camera_y_bottom = 0.0248
    camera_y_flash = 0.0108
    make_prism(
        "CameraIsland", (camera_x, camera_module_center_y, 0.0), 0.0245, 0.0440,
        -FRAME_DEPTH - 0.00058, -FRAME_DEPTH + 0.000025, 0.0119,
        graphite_frame, camera_assembly, edge_bevel=0.00012, segments=10,
    )
    for lens_name, y in [("Wide", camera_y_top), ("UltraWide", camera_y_bottom)]:
        make_cylinder(
            f"CameraRing_{lens_name}", (camera_x, y, -FRAME_DEPTH - 0.00057),
            0.00660, 0.00046, camera_ring, camera_assembly, bevel_width=0.00008,
        )
        make_cylinder(
            f"CameraLens_{lens_name}", (camera_x, y, -FRAME_DEPTH - 0.00086),
            0.00545, 0.00012, camera_glass, camera_assembly,
        )
    make_cylinder(
        "Flash", (camera_x, camera_y_flash, -FRAME_DEPTH - 0.00072),
        0.0026, 0.00022, flash_material, camera_assembly,
    )

    # Small front-facing camera apertures; these remain geometry, not a screen texture.
    add_round_hole(
        "Camera_MainFront", RIGHT_BODY_CENTER_X, 0.0510, SCREEN_LIFT + 0.00007,
        0.0010, camera_glass, right_body,
    )
    add_round_hole(
        "Camera_Cover", cover_center_x, 0.0504, -FRAME_DEPTH + 0.00002,
        0.00105, camera_glass, right_body,
    )

    # Fold axis exterior: it is hidden in the open seam and becomes the narrow
    # outer spine when the left leaf folds over the right one.
    make_prism(
        "Hinge_Exterior", (0.0006, 0.0, -FRAME_DEPTH / 2.0), 0.0012, HEIGHT,
        -FRAME_DEPTH, 0.0, 0.00052, hinge_metal, hinge, edge_bevel=0.00018,
    )

    # Side buttons on the right chassis.
    # Buttons sit flush to the stated device-width envelope.
    side_x = -HALF_WIDTH + 0.00020
    make_box(
        "Button_Volume_Up", (side_x, 0.030, -FRAME_DEPTH / 2.0),
        (0.00040, 0.0125, 0.0013), graphite_frame, right_body, 0.00018, 3,
    )
    make_box(
        "Button_Volume_Down", (side_x, 0.0135, -FRAME_DEPTH / 2.0),
        (0.00040, 0.0125, 0.0013), graphite_frame, right_body, 0.00018, 3,
    )
    make_box(
        "Button_Power", (side_x, -0.008, -FRAME_DEPTH / 2.0),
        (0.00040, 0.0160, 0.0013), graphite_frame, right_body, 0.00018, 3,
    )

    # Bottom USB-C and speaker/microphone details. They are shallow exterior cues.
    bottom_y = -HEIGHT / 2.0
    make_box(
        "USB-C_Port", (RIGHT_BODY_CENTER_X, bottom_y + 0.00009, -FRAME_DEPTH / 2.0),
        (0.0080, 0.00018, 0.0020), black_detail, right_body, 0.00055, 5,
    )
    for index, x in enumerate((-0.024, -0.027, -0.030, -0.033, -0.036), start=1):
        add_round_hole(
            f"Speaker_Opening_{index}", x, bottom_y + 0.00006, -FRAME_DEPTH / 2.0,
            0.00034, black_detail, right_body, normal="negative_y",
        )
    add_round_hole(
        "Top_Microphone", RIGHT_BODY_CENTER_X - 0.010, HEIGHT / 2.0 - 0.00006,
        -FRAME_DEPTH / 2.0, 0.00034, black_detail, right_body, normal="positive_y",
    )

    # Blender-side pose, dimension, name, transform, material, and screen checks.
    bpy.context.view_layer.update()
    required_names = {
        "GalaxyZFold8", "HingeRoot", "LeftBodyPivot", "RightBodyPivot", "LeftBody", "RightBody", "Hinge",
        "Screen_Main_Left", "Screen_Main_Right", "Screen_Cover", "CameraAssembly", "CameraLens_Wide", "CameraLens_UltraWide", "Flash",
    }
    missing = sorted(name for name in required_names if bpy.data.objects.get(name) is None)
    if missing:
        raise AssertionError(f"Missing required nodes: {missing}")
    if left_pivot.parent != hinge_root or right_pivot.parent != hinge_root:
        raise AssertionError("Both body pivots must be children of HingeRoot")
    if left_body.parent != left_pivot or right_body.parent != right_pivot:
        raise AssertionError("Each body must be parented to its own pivot")
    if any(abs(value - 1.0) > 1e-6 for obj in bpy.data.objects if obj.type == "MESH" for value in obj.scale):
        raise AssertionError("A mesh contains an unapplied or non-uniform scale")
    if any(obj.type not in {"MESH", "EMPTY"} for obj in bpy.data.objects if obj.parent in {left_body, right_body, camera_assembly, hinge}):
        raise AssertionError("Unexpected object type in a geometry group")
    if any(obj.data.materials is None or len(obj.data.materials) == 0 for obj in bpy.data.objects if obj.type == "MESH"):
        raise AssertionError("A mesh has no material")

    screen_left = bpy.data.objects["Screen_Main_Left"]
    screen_right = bpy.data.objects["Screen_Main_Right"]
    screen_cover = bpy.data.objects["Screen_Cover"]
    if screen_left == screen_right or screen_left.parent != left_body or screen_right.parent != right_body:
        raise AssertionError("Main display halves must be separate meshes on separate bodies")
    if screen_cover.parent != right_body:
        raise AssertionError("Cover screen must belong to the right body")
    if len(screen_left.data.uv_layers) != 1 or len(screen_right.data.uv_layers) != 1 or len(screen_cover.data.uv_layers) != 1:
        raise AssertionError("Replaceable screen meshes must have a single normalized UV layer")
    for screen in (screen_left, screen_right, screen_cover):
        uv_values = [tuple(loop.uv) for loop in screen.data.uv_layers[0].data]
        if any(value < -1e-6 or value > 1.0 + 1e-6 for uv in uv_values for value in uv):
            raise AssertionError(f"{screen.name} has UV coordinates outside the 0–1 range")
    if bpy.data.objects["CameraLens_Wide"].parent != camera_assembly or bpy.data.objects["CameraLens_UltraWide"].parent != camera_assembly:
        raise AssertionError("Both rear lenses must be grouped under CameraAssembly")
    if bpy.data.objects["CameraIsland"].parent != camera_assembly or bpy.data.objects["Flash"].parent != camera_assembly:
        raise AssertionError("Camera island and flash must stay on the rear camera assembly")
    camera_island = bpy.data.objects["CameraIsland"]
    camera_flash = bpy.data.objects["Flash"]
    island_front_z = min(vertex.co.z for vertex in camera_island.data.vertices)
    wide_ring = bpy.data.objects["CameraRing_Wide"]
    wide_lens = bpy.data.objects["CameraLens_Wide"]
    ring_front_z = wide_ring.location.z + min(vertex.co.z for vertex in wide_ring.data.vertices)
    lens_front_z = wide_lens.location.z + min(vertex.co.z for vertex in wide_lens.data.vertices)
    flash_front_z = camera_flash.location.z + min(vertex.co.z for vertex in camera_flash.data.vertices)
    if -FRAME_DEPTH - island_front_z < 0.00045:
        raise AssertionError("Camera island must protrude clearly beyond the rear body face")
    if island_front_z - ring_front_z < 0.00015 or ring_front_z - lens_front_z < 0.00005:
        raise AssertionError("Camera plate, lens rings, and glass must form distinct depth layers")
    if island_front_z - flash_front_z < 0.00015:
        raise AssertionError("Flash must sit visibly proud on the raised camera island")
    capsule_radius = 0.0119
    capsule_center_y = 0.0280
    capsule_cap_center_y = capsule_center_y - (0.0440 / 2.0 - capsule_radius)
    if abs(camera_flash.location.y - capsule_cap_center_y) + 0.0026 > capsule_radius:
        raise AssertionError("Flash diffuser must fit inside the lower end of the camera island")
    if camera_x <= 0.0 or abs(HALF_WIDTH - camera_x - 0.0245 / 2.0 - 0.00595) > 1e-6:
        raise AssertionError("Camera island must sit near the outer edge of the reference-left half")
    if abs(HEIGHT / 2.0 - camera_module_center_y - 0.0440 / 2.0 - 0.01195) > 1e-6:
        raise AssertionError("Camera island must retain a deliberate upper-edge margin")

    # Each leaf pivot must move its own body while leaving the other leaf in place.
    set_fold(left_pivot, right_pivot, 0.0)
    left_probe = left_frame.matrix_world @ Vector((LEFT_BODY_CENTER_X, 0.0, -FRAME_DEPTH / 2.0))
    right_probe = right_frame.matrix_world @ Vector((RIGHT_BODY_CENTER_X, 0.0, -FRAME_DEPTH / 2.0))
    right_pivot.rotation_euler.y = math.radians(12.0)
    bpy.context.view_layer.update()
    left_probe_after = left_frame.matrix_world @ Vector((LEFT_BODY_CENTER_X, 0.0, -FRAME_DEPTH / 2.0))
    right_probe_after = right_frame.matrix_world @ Vector((RIGHT_BODY_CENTER_X, 0.0, -FRAME_DEPTH / 2.0))
    if (left_probe_after - left_probe).length > 1e-7:
        raise AssertionError("Right pivot unexpectedly moved the left body")
    if (right_probe_after - right_probe).length < 0.001:
        raise AssertionError("Right pivot did not independently move the right body")
    set_fold(left_pivot, right_pivot, 0.0)

    panel_objects = [left_frame, right_frame, screen_left, screen_right]
    set_fold(left_pivot, right_pivot, 0.0)
    open_dims = bounds_dimensions(panel_objects)
    assert_close("Open width", open_dims[0], WIDTH_OPEN, 0.00005)
    assert_close("Open height", open_dims[1], HEIGHT, 0.00005)
    assert_close("Open body thickness", open_dims[2], THICKNESS_OPEN, 0.00005)

    fold_results = {}
    for degrees in (180.0, 135.0, 90.0, 45.0, 0.0):
        set_fold(left_pivot, right_pivot, degrees)
        # Pivots must remain on the shared vertical hinge line at every angle.
        left_origin = left_pivot.matrix_world.translation
        right_origin = right_pivot.matrix_world.translation
        if (left_origin - right_origin).length > 1e-7 or abs(left_origin.x) > 1e-7 or abs(left_origin.z) > 1e-7:
            raise AssertionError(f"Pivot detached from the hinge axis at {degrees:g} degrees")
        dims = bounds_dimensions(panel_objects)
        fold_results[str(int(degrees))] = {"width_m": dims[0], "height_m": dims[1], "thickness_m": dims[2]}
        if abs(dims[1] - HEIGHT) > 0.00005:
            raise AssertionError(f"Device height changed at {degrees:g} degrees")
    set_fold(left_pivot, right_pivot, 180.0)
    folded_objects = panel_objects + [bpy.data.objects["Hinge_Exterior"]]
    folded_dims = bounds_dimensions(folded_objects)
    assert_close("Folded width including hinge spine", folded_dims[0], WIDTH_FOLDED, 0.00008)
    assert_close("Folded height", folded_dims[1], HEIGHT, 0.00005)

    # All model objects live under the one named asset root; no scene cameras,
    # lights, debug meshes, or promotional textures are added to the export.
    descendants = []
    for obj in bpy.data.objects:
        parent = obj.parent
        while parent:
            if parent == root:
                descendants.append(obj)
                break
            parent = parent.parent
    model_meshes = [obj for obj in descendants if obj.type == "MESH"]
    if len(model_meshes) != len({obj.name for obj in model_meshes}):
        raise AssertionError("Duplicate mesh object names found")
    set_fold(left_pivot, right_pivot, 180.0)
    full_folded_dims = bounds_dimensions(model_meshes)
    assert_close("Folded full depth including the camera bump", full_folded_dims[2], THICKNESS_FOLDED, 0.00005)
    set_fold(left_pivot, right_pivot, 0.0)

    previews = render_inspection(root, left_pivot, right_pivot, camera_x)
    set_fold(left_pivot, right_pivot, 0.0)
    bpy.context.view_layer.update()

    # Triangle counts match evaluated geometry (including bevel modifiers).
    vertex_count = 0
    triangle_count = 0
    for obj in model_meshes:
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        vertex_count += len(mesh.vertices)
        triangle_count += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_vertex_color="NONE",
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )

    report = {
        "blender_version": bpy.app.version_string,
        "model": "Unofficial Galaxy Z Fold8 exterior concept for Fril Studio",
        "dimensions_mm": {
            "open_body": [round(value * 1000.0, 3) for value in open_dims],
            "folded_width_height_core_stack_mm": [round(value * 1000.0, 3) for value in folded_dims],
            "folded_full_envelope_mm": [round(value * 1000.0, 3) for value in full_folded_dims],
            "official_open": [161.4, 123.9, 4.5],
            "official_folded": [81.9, 123.9, 9.7],
        },
        "fold_test_degrees": [180, 135, 90, 45, 0],
        "fold_state_bounds_m": fold_results,
        "runtime_nodes": sorted(required_names),
        "mesh_object_count": len(model_meshes),
        "asset_object_count_including_groups": len(descendants) + 1,
        "vertex_count_evaluated": vertex_count,
        "triangle_count_evaluated": triangle_count,
        "glb_size_bytes": GLB_PATH.stat().st_size,
        "glb_size_mib": round(GLB_PATH.stat().st_size / (1024.0 * 1024.0), 4),
        "previews": previews,
        "checks": {
            "required_nodes": "passed",
            "reference_view_left_right_layout": "passed; rear camera half projects left, opposite display half right",
            "hinge_centered_pivots": "passed at 0, 45, 90, 135, 180 degrees",
            "independent_body_pivots": "passed; rotating either leaf leaves the other stationary",
            "open_dimensions": "passed",
            "folded_dimensions": "passed; full depth includes the camera bump approximation",
            "independent_screens_and_uvs": "passed",
            "camera_dual_lens_geometry": "passed",
            "raised_camera_island_and_flash_grouping": "passed",
            "camera_plate_ring_lens_flash_depth_layers": "passed",
            "materials_and_mesh_scales": "passed",
        },
    }
    (INSPECTION_DIR / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print("FOLD8_BUILD_REPORT=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
