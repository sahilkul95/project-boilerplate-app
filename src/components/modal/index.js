import { h } from 'preact';

export const Modal = ({ onClose, title, children, isThisPreviewModal }) => {
  return (
    <div class="modal" className={'modal ' + (isThisPreviewModal ? 'previewModalStyling' : '')}>
      <div class="modal-content">
        <header class="modal-header">
          <h6 style="font-size: 1.2rem;">{title}</h6>
          <a class="close" onClick={onClose}>
            x
          </a>
        </header>
        { children }
      </div>
    </div>
  );
};

export const ModalBody = ({ children }) => {
  return (
    <section class="modal-body">
      { children }
    </section>
  );
};

export const ModalFooter = ({ children }) => {
  return (
    <footer class="modal-footer">
      { children }
    </footer>
  );
};
