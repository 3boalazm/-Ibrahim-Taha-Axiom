/**
 * Editorial imagery for the site.
 *
 * Every image here is an abstract, generated still life — glass regression
 * surfaces, sculpted density curves, lattices, a desk, embossed contours.
 * There are no depictions of people, no religious symbols, no alcohol, no
 * figurative art of living beings, and no text in any asset, so nothing in the
 * design can raise a content concern. Alt text is bilingual and describes the
 * picture literally.
 */
import type { Lang } from './schema';

export interface Picture {
  src: string;
  alt: Record<Lang, string>;
  width: number;
  height: number;
}

export const PICTURES = {
  hero: {
    src: '/images/hero.webp',
    width: 2000,
    height: 1126,
    alt: {
      en: 'An abstract sculpture of a statistical surface: ivory ceramic ridges and pale green glass',
      ar: 'منحوتة تجريدية لسطح إحصائي: تلال من السيراميك العاجي وصفيح زجاجي أخضر فاتح',
    },
  },
  surface: {
    src: '/images/surface.webp',
    width: 1024,
    height: 1536,
    alt: {
      en: 'A translucent regression surface with fine contour lines and tiny brass data points',
      ar: 'سطح انحدار زجاجي شفاف بخطوط كنتورية دقيقة ونقاط بيانات نحاسية صغيرة',
    },
  },
  distributions: {
    src: '/images/distributions.webp',
    width: 1536,
    height: 1024,
    alt: {
      en: 'Bell-shaped density curves sculpted in pale glass on a plaster surface',
      ar: 'منحنيات كثافة على شكل جرس منحوتة في زجاج فاتح على سطح من الجص',
    },
  },
  lattice: {
    src: '/images/lattice.webp',
    width: 1024,
    height: 1536,
    alt: {
      en: 'A precise metal lattice of rods and brass spheres in a deep green void',
      ar: 'شبكة معدنية دقيقة من قضبان وكُرات نحاسية في فضاء أخضر داكن',
    },
  },
  ribbon: {
    src: '/images/ribbon.webp',
    width: 1600,
    height: 750,
    alt: {
      en: 'A long ribbon of brushed brass curving in front of a bone-plaster wall',
      ar: 'شريط طويل من النحاس المصقول ينحني أمام جدار من الجص العاجي',
    },
  },
  strata: {
    src: '/images/strata.webp',
    width: 1400,
    height: 933,
    alt: {
      en: 'Thin sheets of frosted glass and pale ceramic stacked and offset like a stepped regression plane',
      ar: 'صفحات رقيقة من الزجاج المصنفر والسيراميك الفاتح مكدَّسة ومُزاحة كسطح انحدار متدرّج',
    },
  },
  portrait: {
    src: '/images/portrait.webp',
    width: 1000,
    height: 1242,
    alt: {
      en: 'Portrait of Ibrahim Taha in a navy suit, arms folded, against a bone-plaster studio wall engraved with a sine wave and a normal density curve',
      ar: 'صورة الدكتور إبراهيم طه ببذلة كحلية وذراعين متشابكتين، أمام حائط جصّي عاجي محفور عليه منحنى جيبي ومنحنى كثافة طبيعي',
    },
  },
  portraitWide: {
    src: '/images/portrait-wide.webp',
    width: 1600,
    height: 900,
    alt: {
      en: 'Ibrahim Taha in a navy suit and patterned tie, arms folded, against a bone-plaster wall with an engraved density curve and a thin graph grid',
      ar: 'إبراهيم طه ببذلة كحلية وربطة عنق منقوشة وذراعين متشابكتين، أمام حائط جصّي عاجي عليه منحنى كثافة محفور وشبكة بيانية رقيقة',
    },
  },
  sine: {
    src: '/images/sine.webp',
    width: 1400,
    height: 722,
    alt: {
      en: 'A continuous sine wave cast in brushed brass, resting on a plaster plinth',
      ar: 'موجة جيبية متصلة مصبوبة في النحاس المصقول، مستقرة على قاعدة من الجص',
    },
  },
  polyhedra: {
    src: '/images/polyhedra.webp',
    width: 900,
    height: 1350,
    alt: {
      en: 'A pyramid, an octahedron and a sphere in ivory ceramic and brass on a plaster surface',
      ar: 'هرمٌ ومُجسَّم ثماني الوجوه وكرة من السيراميك العاجي والنحاس على سطح من الجص',
    },
  },
  matrix: {
    src: '/images/matrix.webp',
    width: 900,
    height: 1350,
    alt: {
      en: 'A three-dimensional grid of frosted-glass cubes divided by thin brass lines',
      ar: 'شبكة ثلاثية الأبعاد من مكعبات الزجاج المصنفر تفصل بينها خطوط نحاسية رقيقة',
    },
  },
  tangent: {
    src: '/images/tangent.webp',
    width: 1300,
    height: 867,
    alt: {
      en: 'A polished brass rod touching a plaster curve at a single point marked by a small sphere',
      ar: 'قضيب نحاسي مصقول يلمس منحنى من الجبس في نقطة واحدة تُحدِّدها كرة صغيرة',
    },
  },
  study: {
    src: '/images/study.webp',
    width: 1024,
    height: 1536,
    alt: {
      en: 'A quiet academic desk: an open blank notebook with geometric pencil sketches, a fountain pen and a brass ruler',
      ar: 'مكتب أكاديمي هادئ: دفتر مفتوح برسوم هندسية بالقلم الرصاص، وقلم حبر، ومسطرة نحاسية',
    },
  },
  contours: {
    src: '/images/contours.webp',
    width: 1800,
    height: 1012,
    alt: {
      en: 'Embossed contour lines on a dark green surface',
      ar: 'خطوط كنتورية بارزة على سطح أخضر داكن',
    },
  },
} satisfies Record<string, Picture>;

/** Research areas, each with an abstract image rather than a stock photograph. */
export const AREA_PICTURES: Record<string, Picture> = {
  'penalized-count-regression': PICTURES.surface,
  'beta-regression': PICTURES.distributions,
  'bayesian-estimation': PICTURES.lattice,
  'applied-quantitative-studies': PICTURES.study,
  'panel-data-and-cointegration': PICTURES.strata,
  'statistical-reporting-and-software': PICTURES.matrix,
};

export const areaPicture = (id: string): Picture | undefined => AREA_PICTURES[id];
