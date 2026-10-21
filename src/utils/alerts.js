import Swal from 'sweetalert2';

// Brand-themed success popup used after create/update actions.
export function showSuccessAlert(title, text) {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#191489',
    timer: 2500,
    timerProgressBar: true,
  });
}
