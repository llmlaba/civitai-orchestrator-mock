import { NodeGraph, mapSampler, ref, getModelPath } from '../base.js';

export function buildStandardT2I(job, modelMap, options = {}) {
  const graph = new NodeGraph();
  const { params, additionalNetworks } = job;
  const ckpt_name = getModelPath(job.model, modelMap);

  const ckpt = graph.add('CheckpointLoaderSimple', 'CheckpointLoaderSimple', { ckpt_name });
  let modelRef = ref(ckpt, 0);
  let clipRef = ref(ckpt, 1);
  const vaeRef = ref(ckpt, 2);

  // LoRA chain
  if (additionalNetworks && Object.keys(additionalNetworks).length) {
    const entries = Object.entries(additionalNetworks)
      .filter(([, net]) => net && String(net.type).toLowerCase() === 'lora')
      .map(([id, net]) => ({ id, ...net }));
    const order = Array.isArray(job.loraOrder) ? job.loraOrder : null;
    entries.sort((a, b) => order ? (order.indexOf(a.id) - order.indexOf(b.id)) : a.id.localeCompare(b.id));
    for (const net of entries) {
      const lora_name = getModelPath(net.id, modelMap);
      const loraNode = graph.add('LoraLoader', 'LoraLoader', {
        lora_name,
        strength_model: net.strength ?? 1,
        strength_clip: net.strength ?? 1,
        model: modelRef,
        clip: clipRef,
      });
      modelRef = ref(loraNode, 0);
      clipRef = ref(loraNode, 1);
    }
  }

  // ClipSetLastLayer (if enabled)
  let clipForEnc = clipRef;
  if (options.clipSkipSupported || options.alwaysUseClipSet) {
    const stop_at_clip_layer = -(params?.clipSkip ?? 0) || 0;
    const clipSetNode = graph.add('CLIPSetLastLayer', 'CLIPSetLastLayer', { stop_at_clip_layer, clip: clipRef });
    clipForEnc = ref(clipSetNode, 0);
  }

  const posEnc = graph.add('smZ CLIPTextEncode', 'smZ CLIPTextEncode', {
    parser: 'A1111', text_g: '', text_l: '', text: params.prompt || '',
    width: params.width, height: params.height, crop_w: 0, crop_h: 0,
    target_width: params.width, target_height: params.height, ascore: 6,
    mean_normalization: false, multi_conditioning: true, use_old_emphasis_implementation: false,
    with_SDXL: false, clip: clipForEnc,
  });

  const negEnc = graph.add('smZ CLIPTextEncode', 'smZ CLIPTextEncode', {
    parser: 'A1111', text_g: '', text_l: '', text: params.negativePrompt || '',
    width: params.width, height: params.height, crop_w: 0, crop_h: 0,
    target_width: params.width, target_height: params.height, ascore: 2.5,
    mean_normalization: false, multi_conditioning: true, use_old_emphasis_implementation: false,
    with_SDXL: false, clip: clipForEnc,
  });

  const empty = graph.add('EmptyLatentImage', 'EmptyLatentImage', {
    width: params.width, height: params.height, batch_size: 1,
  });

  const ksampler = graph.add('KSampler', 'KSampler', {
    sampler_name: mapSampler(params.scheduler),
    scheduler: 'normal', seed: params.seed, steps: params.steps,
    cfg: params.cfgScale, denoise: 1,
    latent_image: ref(empty, 0), model: modelRef,
    positive: ref(posEnc, 0), negative: ref(negEnc, 0),
  });

  const vae = graph.add('VAEDecode', 'VAEDecode', {
    samples: ref(ksampler, 0), vae: vaeRef,
  });

  graph.add('SaveImageWebsocket', 'SaveImageWebsocket', { images: ref(vae, 0) });

  return graph.nodes;
}
