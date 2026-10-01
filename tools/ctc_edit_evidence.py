"""Exact, bounded same-context CTC edit likelihoods for research evaluation."""


def context_edits(frames, reference, position, inventory, blank, torch):
    if (not 0 <= position < len(reference) or not inventory or
            len(set(inventory)) != len(inventory) or blank in inventory or
            any(p not in inventory for p in reference) or
            any(not isinstance(p, int) or p < 0 or p >= frames.shape[1] for p in inventory) or
            not 0 <= blank < frames.shape[1] or len(frames) > 1000 or len(reference) > 96):
        raise ValueError("Invalid or oversized lexical context")
    candidates = [reference[:position] + [p] + reference[position+1:] for p in inventory]
    candidates.append(reference[:position] + reference[position+1:])
    probabilities = torch.from_numpy(frames).to(torch.float64)
    probabilities = probabilities[:, None, :].expand(-1, len(candidates), -1).contiguous()
    targets = torch.tensor([p for candidate in candidates for p in candidate], dtype=torch.int64)
    with torch.inference_mode():
        losses = torch.nn.functional.ctc_loss(probabilities, targets,
            torch.full((len(candidates),), len(frames), dtype=torch.int64),
            torch.tensor([len(candidate) for candidate in candidates], dtype=torch.int64),
            blank=blank, reduction="none", zero_infinity=False)
    return -losses.numpy()
