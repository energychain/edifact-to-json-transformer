function determineSegmentLevel(segments, currentIndex) {
  const seg = segments[currentIndex];
  const prevSeg = currentIndex > 0 ? segments[currentIndex - 1] : null;

  if (seg.tag === 'NAD' && prevSeg?.tag === 'UNH') {
    return 0;
  }

  if (seg.tag === 'LOC' && prevSeg?.tag === 'IDE') {
    return 1;
  }

  if (seg.tag === 'CCI') {
    return 2;
  }

  if (seg.tag === 'RFF' && prevSeg?.tag === 'BGM') {
    return 0;
  }

  return 1;
}

function extractSegmentGroupsHierarchical(segments) {
  const groups = [];
  let currentLevel0Group = null;
  let currentLevel1Group = null;
  let currentLevel2Group = null;
  let segmentIndex = 0;

  const groupStarters = {
    LOC: 'location',
    NAD: 'party',
    LIN: 'line_item',
    QTY: 'quantity',
    SEQ: 'sequence',
    IDE: 'identification',
    CCI: 'characteristic',
    RFF: 'reference'
  };

  segments.forEach((segment, idx) => {
    segmentIndex += 1;
    const isGroupStarter = groupStarters[segment.tag];

    if (isGroupStarter) {
      const level = determineSegmentLevel(segments, idx);

      const group = {
        id: `SG_${segmentIndex}`,
        type: isGroupStarter,
        level,
        starter_segment: segment.tag,
        segments: [segment],
        children: []
      };

      if (level === 0) {
        currentLevel0Group = group;
        currentLevel1Group = null;
        currentLevel2Group = null;
        groups.push(group);
      } else if (level === 1) {
        currentLevel1Group = group;
        currentLevel2Group = null;
        if (currentLevel0Group) {
          currentLevel0Group.children.push(group);
        } else {
          groups.push(group);
        }
      } else if (level === 2) {
        currentLevel2Group = group;
        if (currentLevel1Group) {
          currentLevel1Group.children.push(group);
        } else if (currentLevel0Group) {
          currentLevel0Group.children.push(group);
        } else {
          groups.push(group);
        }
      }
    } else if (currentLevel2Group) {
      currentLevel2Group.segments.push(segment);
    } else if (currentLevel1Group) {
      currentLevel1Group.segments.push(segment);
    } else if (currentLevel0Group) {
      currentLevel0Group.segments.push(segment);
    }
  });

  return groups;
}

module.exports = {
  determineSegmentLevel,
  extractSegmentGroupsHierarchical
};
