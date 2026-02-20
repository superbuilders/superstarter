---
title: Security & Compliance Measures
product: vercel
url: /docs/security/compliance
type: reference
prerequisites:
  - /docs/security
related:
  - /docs/security/ddos-mitigation
  - /docs/security/shared-responsibility
  - /docs/security/pci-dss
  - /docs/secure-compute
  - /docs/regions
summary: Learn about the protection and compliance measures Vercel takes to ensure the security of your data, including DDoS mitigation and SOC 2 compliance.
---

# Security & Compliance Measures

This page covers the protection and compliance measures Vercel takes to ensure the security of your data, including [DDoS mitigation](/docs/security/ddos-mitigation), [SOC2 Type 2 compliance](#soc-2-type-2), [Data encryption](#data-encryption), and more.

To understand how security responsibilities are divided between you (the customer) and Vercel, see the [shared responsibility model](/docs/security/shared-responsibility). It explains who is responsible for each aspect of keeping your cloud services secure and running smoothly.

## Compliance

### SOC 2 Type 2

System and Organization Control 2 Type 2 ([SOC 2](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)) is a compliance framework developed by the American Institute of Certified Public Accountants ([AICPA](https://us.aicpa.org/forthepublic)) that focuses on how an organization's services remain secure and protect customer data. The framework contains 5 Trust Services Categories ([TSCs](https://www.schellman.com/blog/soc-examinations/soc-2-trust-services-criteria-with-tsc)), which contain criteria to evaluate the controls and service commitments of an organization.

**Vercel has a SOC 2 Type 2 attestation for Security, Confidentiality, and Availability**.

More information is available at [security.vercel.com](https://security.vercel.com/).

### ISO 27001:2022

ISO 27001 is an internationally recognized standard, developed by the International Organization for Standardization (ISO) and International Electrotechnical Commission (IEC), that provides organizations with a systematic approach to securing confidential company and customer information.

**Vercel is ISO 27001:2022 certified**. Our certificate is available [here](https://www.schellman.com/certificate-directory?certificateNumber=1868222-1).

### GDPR

The EU General Data Protection Regulation (GDPR), is a comprehensive data protection law that governs the use, sharing, transfer, and processing of EU personal data. For UK personal data, the provisions of the EU GDPR have been incorporated into UK law as the UK GDPR.

Vercel supports GDPR compliance, which means that we commit to the following:

- Implement and maintain appropriate technical and organizational security measures surrounding customer data
- Notify our customers without undue delay of any data breaches
- Impose similar data protection obligations on our sub-processors as we do for ourselves
- Respond to applicable [data subjects rights](/legal/privacy-policy#eea), including requests for access, correction, and/or deletion of their personal data
- Rely on the EU Standard Contractual Clauses and the UK Addendum as valid data transfer mechanisms when transferring personal data outside the EEA

For more information on how Vercel protects your personal data, and the data of your customers, refer to our [Privacy Policy](/legal/privacy-policy) and [Data Processing Addendum](/legal/dpa).

### PCI DSS

Payment Card Industry Data Security Standard (PCI DSS) is a standard that defines the security and privacy requirements for payment card processing. PCI compliance requires that businesses who handle customer credit card information adhere to a set of information security standards.

In alignment with Vercel’s [shared responsibility model](/docs/security/shared-responsibility), Vercel serves as a service provider to customers who process payment and cardholder data. Customers should select an appropriate payment gateway provider to integrate an `iframe` into their application. This ensures that any information entered in the `iframe` goes directly to their payment processor and is isolated from their application’s managed infrastructure on Vercel.

[Learn about PCI DSS iframe integration](/docs/security/pci-dss).

Vercel provides both a Self-Assessment Questionnaire D (SAQ-D) Attestation of Compliance (AOC) for service providers and a Self-Assessment Questionnaire A (SAQ-A) Attestation of Compliance (AOC) for merchants under PCI DSS v4.0.

PCI DSS compliance is a shared responsibility between Vercel and its customers. To help customers better understand their responsibilities, Vercel also provides a Responsibility Matrix which outlines the security and compliance obligations between Vercel and its customers.

A copy of our PCI DSS compliance documentation can be obtained through our [Trust Center](https://security.vercel.com).

[Contact us](https://vercel.com/contact/sales/security) for more details about our SAQ-D and SAQ-A AOC reports or Responsibility Matrix.

### HIPAA

Certain businesses, covered entities, and business associates, are required to comply with these regulations to ensure that health data is transmitted without compromising its security.
The [Health Information Portability and Accountability Act](https://www.hhs.gov/hipaa/) (HIPAA) is one of the most important sectoral regulations related to privacy within the United States (US). The Secretary for the [Health and Human Services](https://www.hhs.gov/) (HHS) developed a set of required national standards designed to protect the confidentiality, integrity, and availability of health data. Certain businesses, covered entities and business associates, are required to comply with these regulations to ensure that health data is transmitted without compromising its security.

Vercel supports HIPAA compliance as a **business associate** by committing to the following:

- Implementing and maintaining appropriate technical and organizational security measures designed to safeguard a customer's [Protected Health Information](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html#:~:text=Information%20is%20Protected-,Protected%20Health%20Information.,health%20information%20\(PHI\).%22 "What is PHI?") (PHI)
- Notifying customers of any data breaches without undue delay
- Signing Business Associate Agreements (BAAs) with enterprise customers

#### Additional protection

Customers subject to HIPAA may enable [Vercel Secure Compute (available on Enterprise plans)](/docs/secure-compute) for additional layers of protection. This allows customers to have more control over which resources they allow to have access to their information through:

- Private, isolated cloud environments
- Dedicated outgoing IP addresses

[VPC peering and VPN support](/docs/secure-compute#vpn-support) (built on top of Secure Compute) allows customers to create fewer entry points into their networks by establishing secure tunnels within their AWS infrastructure.

[Learn](https://security.vercel.com/?itemUid=aec41c33-0f3a-4030-ac59-49adfd4a975b\&source=click) about how Vercel supports HIPAA compliance.

[Contact us](https://vercel.com/contact/sales/security) to request a **BAA** or to add Secure Compute to your plan.

### EU-U.S Data Privacy Framework

The EU-U.S [Data Privacy Framework](https://www.dataprivacyframework.gov) (DPF) provides U.S. organizations a reliable mechanism for transferring personal data from the European Union (EU), United Kingdom (UK), and Switzerland to the United States (U.S.) while ensuring data protection that is consistent with EU, UK, and Swiss law.

The International Trade Administration (ITA) within the U.S. Department of Commerce administers the DPF program, enabling eligible U.S.-based organizations to certify their compliance with the framework.

**Vercel is certified under the EU-U.S. Data Privacy Framework.** To view our public listing, visit the [Data Privacy Framework website](https://www.dataprivacyframework.gov/list).

Vercel's certification provides adequate data protection for transferring personal data outside of the EU, UK, and Switzerland under the EU/UK [General Data Protection Regulation](https://gdpr-info.eu/) (GDPR) and UK Data Protection Act 2018, as well as the [Swiss Federal Act on Data Protection](https://www.fedlex.admin.ch/eli/cc/2022/491/en) (FADP).

[Learn more](https://security.vercel.com/?itemName=data_privacy\&source=click) about Vercel's data privacy practices or visit our [Privacy Notice](https://vercel.com/legal/privacy-policy) for more information.

### TISAX

The [Trusted Information Security Assessment Exchange](https://enx.com/tisax) (TISAX) is a recognized standard in the automotive industry, developed by the German Association of the Automotive Industry (VDA) and governed by the ENX Association. TISAX standardizes information security and privacy principles across the automotive supply chain.

Vercel has achieved TISAX Assessment Level 2 (AL2), which covers requirements for handling information with a high need for protection. This assessment supports customers operating in the automotive and manufacturing sectors by:

- Reducing the time and cost of third party service provider security and privacy reviews
- Aligning with Original Equipment Manufacturer (OEM) and various automotive supply chain requirements
- Supporting compliance across regulated environments

TISAX results are not intended for the general public. Vercel's assessment results are available to registered ENX participants through the [ENX Portal](https://portal.enx.com/en-US/TISAX/tisaxassessmentresults).

[Contact us](https://vercel.com/contact/sales/security) for more information.

## Infrastructure

The Vercel CDN and deployment platform primarily uses Amazon Web Services (AWS), and currently has 20 different [regions](/docs/regions) and an [Anycast network](# "What is an Anycast network?") with global IP addresses.

We use a multi-layered security approach that combines people, processes, and technology, including centralized [IAM](# "What is IAM?"), to regulate access to production resources.

We use cloud security processes to develop and implement procedures for provisioning, configuring, managing, monitoring, and accessing cloud resources. Any changes made in production environments are managed through change control using Infrastructure as Code (IaC).

To ensure always-on security, Vercel's edge infrastructure uses a combination of cloud-native and vendor tooling, including cloud security posture management tooling for continuous scanning and alerting.

When an AWS outage occurs in a region, Vercel will automatically route traffic to the nearest available edge, ensuring network resilience.

### Where does my data live?

Vercel operates on a shared responsibility model with customers. Customers have the ability to select their preferred region for deploying their code. The default location for Vercel functions is the U.S., but there are dozens of [regions](/docs/regions#region-list) globally that can be used.

Additionally, Vercel may transfer data to and in the United States and anywhere else in the world where Vercel or its service providers maintain data processing operations. Please see Vercel's [Data Processing Addendum](https://vercel.com/legal/dpa) for further details.

### Failover strategy

- Vercel uses [AWS Global Accelerator](https://aws.amazon.com/global-accelerator/) and our Anycast network to automatically reroute traffic to another region in case of regional failure
- [Vercel Functions](/docs/functions/configuring-functions/region#automatic-failover) have multiple availability zone redundancy by default. Multi-region redundancy is available depending on your runtime
- Our core database and data plane is a globally replicated database with rapid manual failover, using multiple availability zones

#### Regional failover

With region-based failover, Vercel data is replicated across multiple regions, and a failover is triggered when an outage occurs in a region. Rapid failover is then provided to secondary regions, allowing users continuous access to critical applications and services with minimal disruption.

#### Resiliency testing

To meet [RTO/RPO](# "What is RTO/RPO?") goals, Vercel conducts recurring resiliency testing. This testing simulates regional failures. Throughout testing, service statuses are also monitored to benchmark recovery time, and alert on any disruptions.

### Data encryption

Vercel encrypts data at rest (when on disk) with 256 bit Advanced Encryption Standard (AES-256). While data is in transit (on route between source and destination), Vercel uses **HTTPS/TLS 1.3**.

> **💡 Note:** If you need isolated runtime infrastructure, you can use [Vercel Secure
> Compute](/docs/secure-compute) to create a private, isolated cloud environment
> with dedicated outgoing IP addresses.

### Data backup

Vercel backs-up customer data at an interval of every two hours, each backup is persisted for 30 days, and is globally replicated for resiliency against regional disasters. Automatic backups are taken without affecting the performance or availability of the database operations.

All backups are stored separately in a storage service. If a database instance is deleted, all associated backups are also automatically deleted. Backups are periodically tested by the Vercel engineering team.

> **💡 Note:** These backups are **not available** to customers and are created for Vercel's
> infrastructure's use in case of disaster.

### Do Enterprise accounts run on a different infrastructure?

Enterprise Teams on Vercel have their own build infrastructure ensuring isolation from Hobby/Pro accounts on Vercel.

### Penetration testing and Audit scans

Vercel conducts regular penetration testing through third-party penetration testers, and has daily code reviews and static analysis checks.


---

[View full sitemap](/docs/sitemap)
