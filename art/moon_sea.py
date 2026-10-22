# Undertow video panel footage: moonlight glitter on open water, black and silver. Our own scene, rendered headless.
# Run: "/Applications/Blender.app/Contents/MacOS/Blender" --background --python art/moon_sea.py -- <out_dir>
import bpy, math, sys, os
out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "art/_frames"
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
eng = [e for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys() if "EEVEE" in e][0]
sc.render.engine = eng
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 540, 720, 100
sc.render.fps, sc.frame_start, sc.frame_end = 24, 1, 144
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = os.path.join(out, "f_")
if hasattr(sc, "eevee"):
    for k, v in (("taa_render_samples", 24), ("use_raytracing", True)):
        if hasattr(sc.eevee, k): setattr(sc.eevee, k, v)
sc.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in sc.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
sc.view_settings.look = "None"

# World: near-black with a faint lift at the horizon.
w = bpy.data.worlds.new("night"); sc.world = w; w.use_nodes = True
nt = w.node_tree; bg = nt.nodes["Background"]
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg.inputs["Color"])
ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = 0.5, (0.018, 0.018, 0.02, 1)
ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = 0.62, (0.0, 0.0, 0.0, 1)
bg.inputs["Strength"].default_value = 1.0

# Ocean: generated grid, time keyframed linearly across the shot.
bpy.ops.mesh.primitive_plane_add(size=2)
sea = bpy.context.object
oc = sea.modifiers.new("ocean", "OCEAN")
oc.geometry_mode = "GENERATE"; oc.resolution = 14; oc.spatial_size = 60; oc.repeat_x = oc.repeat_y = 3
oc.wave_scale = 0.5; oc.choppiness = 1.2; oc.wind_velocity = 9; oc.wave_alignment = 0.4; oc.random_seed = 7
oc.time = 0; oc.keyframe_insert("time", frame=1); oc.time = 6; oc.keyframe_insert("time", frame=145)
for fc in (sea.animation_data.action.fcurves if hasattr(sea.animation_data.action, "fcurves") else []):
    for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
try:
    for layer in sea.animation_data.action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
except AttributeError:
    pass
bpy.ops.object.shade_smooth()
m = bpy.data.materials.new("water"); m.use_nodes = True
p = m.node_tree.nodes["Principled BSDF"]
p.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1); p.inputs["Roughness"].default_value = 0.07
if "Specular IOR Level" in p.inputs: p.inputs["Specular IOR Level"].default_value = 0.9
sea.data.materials.append(m)

# Moon: emissive disc on the horizon, and a low sun behind it that draws the glitter road on the waves.
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.4, location=(0, 140, 9))
moon = bpy.context.object
mm = bpy.data.materials.new("moon"); mm.use_nodes = True
em = mm.node_tree.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 6
mm.node_tree.links.new(em.outputs[0], mm.node_tree.nodes["Material Output"].inputs["Surface"]); moon.data.materials.append(mm)
bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
sun = bpy.context.object; sun.data.energy = 6; sun.data.angle = math.radians(0.6)
sun.rotation_euler = (math.radians(-86), 0, 0)  # points back toward the camera from just above the horizon

bpy.ops.object.camera_add(location=(0, -6, 2.1), rotation=(math.radians(86.5), 0, 0))
cam = bpy.context.object; cam.data.lens = 42; sc.camera = cam
bpy.ops.render.render(animation=True)
print("RENDER_DONE", out)
