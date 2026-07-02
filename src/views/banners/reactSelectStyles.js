// Shared react-select styling matched to CoreUI light form controls
const reactSelectStyles = {
  control: (base, state) => ({
    ...base, backgroundColor: '#fff', color: '#212631',
    borderColor: state.isFocused ? '#998fed' : '#b1b7c1',
    boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(50,31,219,.25)' : 'none',
    minHeight: 36,
  }),
  menu: (base) => ({ ...base, backgroundColor: '#fff', zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#321fdb' : state.isFocused ? 'rgba(0,0,21,.05)' : '#fff',
    color: state.isSelected ? '#fff' : '#212631',
  }),
  multiValue: (base) => ({ ...base, backgroundColor: 'rgba(50,31,219,.12)' }),
  multiValueLabel: (base) => ({ ...base, color: '#321fdb' }),
  multiValueRemove: (base) => ({ ...base, color: '#321fdb', ':hover': { backgroundColor: '#321fdb', color: '#fff' } }),
  singleValue: (base) => ({ ...base, color: '#212631' }),
  input: (base) => ({ ...base, color: '#212631' }),
  placeholder: (base) => ({ ...base, color: '#9da5b1' }),
};

export default reactSelectStyles;
