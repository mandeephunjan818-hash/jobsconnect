import tsImg1 from '../../../public/images/testimonial/cs-tes01.png'
import tsImg2 from '../../../public/images/testimonial/cs-tes02.png'
import tsImg3 from '../../../public/images/testimonial/cs-tes03.png'
import tsImg4 from '../../../public/images/testimonial/cs-tes04.png'
import tsImg5 from '../../../public/images/testimonial/cs-tes05.png'

import brand1 from '../../../public/images/brand/brd-logo01.png'
import brand2 from '../../../public/images/brand/brd-logo02.png'
import brand3 from '../../../public/images/brand/brd-logo03.png'
import brand4 from '../../../public/images/brand/brd-logo04.png'
import brand5 from '../../../public/images/brand/brd-logo05.png'

const CustomerStories = [
    {
        left: {
            img: tsImg1,
            subTitle: "customer story",
            logo: brand1,
            title: "Luminous enhances data security.",
        },
        right: {
            content: "“With Innomax's real-time threat detection, our sensitive data is more secure than ever. Their team implemented advanced security measures, ensuring we meet all compliance requirements.”",
            author: {
                name: "Mike Davis",
                designation: "CTO at Luminous",
            },
            stats: [
                {
                    number: "30 min",
                    text: "to detect and neutralize threats, from 3+ hours.",
                },
                {
                    number: "99.8%",
                    text: "Enhanced data protection with real-time monitoring.",
                },
            ],
        },
    },
    {
        left: {
            img: tsImg2,
            subTitle: "customer story",
            logo: brand2,
            title: "Bitstamp secures customer.",
        },
        right: {
            content: "“Innomax transformed our security approach, giving us the confidence to protect our customers' data. Their solutions strengthen our defenses while ensuring full compliance with industry regulations.”",
            author: {
                name: "John Lee",
                designation: "CEO at Bitstamp",
            },
            stats: [
                {
                    number: "20 min",
                    text: "response time, down from over an hour.",
                },
                {
                    number: "100%",
                    text: "compliance achieved with industry security standards.",
                },
            ],
        },
    },
    {
        left: {
            img: tsImg3,
            subTitle: "customer story",
            logo: brand3,
            title: "Santander boosts cybersecurity.",
        },
        right: {
            content: "“Thanks to innomax, we have a strong security framework that protects our data and ensures compliance with industry regulations. Their solutions provide real-time threat detection, with confidence.”",
            author: {
                name: "Sophia Turner",
                designation: "Founder at Santander",
            },
            stats: [
                {
                    number: "45 min",
                    text: "To detect and respond, down from 2+ hours.",
                },
                {
                    number: "99.9%",
                    text: "Protection Near-total visibility against cyber threats.",
                },
            ],
        },
    },
    {
        left: {
            img: tsImg4,
            subTitle: "customer story",
            logo: brand4,
            title: "FirstQuadrant mitigates risk.",
        },
        right: {
            content: "“Innomax’s proactive solutions have greatly reduced our risk exposure. Their expert team implemented strong defenses, helping us stay ahead of evolving cyber threats and keep our business secure.”",
            author: {
                name: "Laura Chen",
                designation: "Founder at FirstQuadrant",
            },
            stats: [
                {
                    number: "15 min",
                    text: "average detection time, a 70% improvement.",
                },
                {
                    number: "98.9%",
                    text: "threat mitigation security success rate.",
                },
            ],
        },
    },
    {
        left: {
            img: tsImg5,
            subTitle: "customer story",
            logo: brand5,
            title: "Madrid Safeguards Against Cyber.",
        },
        right: {
            content: "“Thanks to Innomax, we’ve greatly reduced our vulnerability to cyberattacks. Their advanced solutions give us confidence in our security strategy, ensuring robust protection against threats.”",
            author: {
                name: "Sophia Turner",
                designation: "Founder at Madrid",
            },
            stats: [
                {
                    number: "27 min",
                    text: "to detect and prevent threats, down from 90 minutes.",
                },
                {
                    number: "97.7%",
                    text: "uptime ensured through secure systems integration.",
                },
            ],
        },
    },
];
export default CustomerStories;