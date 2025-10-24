;; Guardian Registry - Smart Device Sentinel
;; Immutable ledger for device lifecycle and activity verification on the blockchain

;; Constants for error handling
(define-constant fail-unauthorized (err u100))
(define-constant error-hub-exists (err u101))
(define-constant error-hub-missing (err u102))
(define-constant error-device-duplicate (err u103))
(define-constant error-device-absent (err u104))
(define-constant error-action-invalid (err u105))
(define-constant error-record-duplicate (err u106))

;; Data structures for governance hub management
(define-map hub-registry
  principal
  {
    hub-identifier: (string-ascii 64),
    registered-at-block: uint
  }
)

;; Sentinel device metadata store
(define-map sentinel-devices
  {
    principal-owner: principal,
    device-identifier: (string-ascii 64)
  }
  {
    human-readable-name: (string-ascii 64),
    device-classification: (string-ascii 32),
    registered-at-block: uint
  }
)

;; Activity record storage with cryptographic proof
(define-map event-attestations
  {
    principal-owner: principal,
    device-identifier: (string-ascii 64),
    event-timestamp: uint
  }
  {
    behavior-hash: (buff 32),
    proof-hash: (buff 32)
  }
)

;; Owner device directory for enumeration
(define-map device-inventory
  principal
  (list 100 (string-ascii 64))
)

;; Helper: verify governance hub exists and is authorized
(define-private (hub-authorized (principal-to-check principal))
  (is-some (map-get? hub-registry principal-to-check))
)

;; Helper: append device to owner's device collection
(define-private (append-device-to-inventory (owner-principal principal) (device-id (string-ascii 64)))
  (let (
    (existing-devices (default-to (list) (map-get? device-inventory owner-principal)))
  )
    (map-set device-inventory owner-principal (append existing-devices device-id))
  )
)

;; Helper: device exists in owner's registered collection
(define-private (device-exists-for-owner (owner-principal principal) (device-id (string-ascii 64)))
  (is-some (map-get? sentinel-devices {principal-owner: owner-principal, device-identifier: device-id}))
)

;; Public functions - Hub Management

;; Enrolls a governance hub for device management
(define-public (enroll-governance-hub (hub-id (string-ascii 64)))
  (let (
    (current-caller tx-sender)
  )
    (asserts! (is-none (map-get? hub-registry current-caller)) error-hub-exists)
    
    (map-set hub-registry current-caller {
      hub-identifier: hub-id,
      registered-at-block: block-height
    })
    
    (ok true)
  )
)

;; Public functions - Device Registration

;; Onboards a new sentinel device to the registry
(define-public (onboard-sentinel-device 
    (device-id (string-ascii 64))
    (readable-name (string-ascii 64))
    (device-class (string-ascii 32)))
  (let (
    (current-caller tx-sender)
  )
    (asserts! (hub-authorized current-caller) error-hub-missing)
    (asserts! (not (device-exists-for-owner current-caller device-id)) error-device-duplicate)
    
    (map-set sentinel-devices 
      {principal-owner: current-caller, device-identifier: device-id}
      {
        human-readable-name: readable-name,
        device-classification: device-class,
        registered-at-block: block-height
      }
    )
    
    (append-device-to-inventory current-caller device-id)
    
    (ok true)
  )
)

;; Public functions - Event Logging

;; Records a cryptographic attestation of device behavior
(define-public (record-event-attestation 
    (device-id (string-ascii 64))
    (event-time uint)
    (behavior-hash (buff 32))
    (proof-hash (buff 32)))
  (let (
    (current-caller tx-sender)
    (record-key {principal-owner: current-caller, device-identifier: device-id, event-timestamp: event-time})
  )
    (asserts! (hub-authorized current-caller) error-hub-missing)
    (asserts! (device-exists-for-owner current-caller device-id) error-device-absent)
    (asserts! (is-none (map-get? event-attestations record-key)) error-record-duplicate)
    
    (map-set event-attestations record-key
      {
        behavior-hash: behavior-hash,
        proof-hash: proof-hash
      }
    )
    
    (ok true)
  )
)

;; Read-only - Hub Information Queries

;; Fetch the enrollment record of a governance hub
(define-read-only (query-hub-details (hub-owner principal))
  (map-get? hub-registry hub-owner)
)

;; Read-only - Device Information Queries

;; Retrieve metadata for a registered sentinel device
(define-read-only (fetch-device-metadata (hub-owner principal) (device-id (string-ascii 64)))
  (map-get? sentinel-devices {principal-owner: hub-owner, device-identifier: device-id})
)

;; Get complete device inventory for a principal
(define-read-only (retrieve-device-collection (hub-owner principal))
  (default-to (list) (map-get? device-inventory hub-owner))
)

;; Read-only - Event Record Queries

;; Look up a specific event attestation from the ledger
(define-read-only (query-event-record (hub-owner principal) (device-id (string-ascii 64)) (event-time uint))
  (map-get? event-attestations {principal-owner: hub-owner, device-identifier: device-id, event-timestamp: event-time})
)

;; Read-only - Verification Functions

;; Validate that a provided proof matches the recorded attestation
(define-read-only (validate-proof-integrity 
    (hub-owner principal)
    (device-id (string-ascii 64))
    (event-time uint)
    (candidate-proof (buff 32)))
  (let (
    (stored-record (map-get? event-attestations {principal-owner: hub-owner, device-identifier: device-id, event-timestamp: event-time}))
  )
    (and
      (is-some stored-record)
      (is-eq candidate-proof (get proof-hash (unwrap-panic stored-record)))
    )
  )
)

;; Check if an event record exists at specified coordinates
(define-read-only (event-exists-at-coordinates (hub-owner principal) (device-id (string-ascii 64)) (event-time uint))
  (is-some (map-get? event-attestations {principal-owner: hub-owner, device-identifier: device-id, event-timestamp: event-time}))
)