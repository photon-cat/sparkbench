// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Drawing;

using SimBase;
using ChipLibrary;
using Schematics;

namespace SimTTL
{

    /// <summary>
    /// Enumerations for the signal value string conversion.
    /// </summary>
    public enum RadixType
    {
        Binary,
        Decimal,
        SignedDec,
        Hexadecimal
    }

    /// <summary>
    /// Base class of am element, that has a vertical coordinate and a text rectangle to check.
    /// </summary>
    public class DisplayElement
    {
        /// <summary>The rectangle area, the name or value text is occupying on the screen.</summary>
        public Rectangle TextRect;
        /// <summary>If true, this element is selected and displayed highlighted.</summary>
        public bool Selected;
        /// <summary>If true, the signal will be always highlighted.</summary>
        public bool Highlight;
        /// <summary>Y-coordinate of the base line of any text.</summary>
        public float SignalY;

        /// <summary>
        /// Creates the instance of this class.
        /// </summary>
        public DisplayElement()
        {
            TextRect = new Rectangle(-1, -1, 0, 0);
            this.Selected = false;
            this.SignalY = -1;
        }

        public bool SelOrHigh
        {
            get { return Selected | Highlight; }
        }
    }

    /// <summary>
    /// A descendant of the DisplayElement containing a reference to a Pin object.
    /// </summary>
    public class DisplayPin : DisplayElement
    {
        /// <summary>Reference to the related Pin object.</summary>
        public readonly Pin Pin;

        /// <summary>
        /// Creates the DisplayPin object and assigns the reference to the Pin object permanently.
        /// </summary>
        /// <param name="Pin">Reference to the Pin object to be assigned.</param>
        public DisplayPin(Pin Pin) : base()
        {
            this.Pin = Pin;
        }
    }

    /// <summary>
    /// A descendant of the DisplayElement containing all information to handle a signal or signal group on the screen.
    /// </summary>
    public class DisplaySignal : DisplayElement
    {
        /// <summary>Reference to the schematics element object.</summary>
        private BaseElement element;
        /// <summary>Array of fixed pin objects of the element.</summary>
        private readonly Pin[] pins;
        /// <summary>Array of fixed pin objects of the element.</summary>
        public readonly DisplayPin[] DisplayPins;
        /// <summary>Screen name build from element name and pin name or from a netlist label.</summary>
        public readonly string ScreenName;
        /// <summary>If true, the signal group will have to be displayed expanded.</summary>
        public bool Expanded;
        /// <summary>If true, the signal or signal group had just been moved and need update.</summary>
        public bool Moved;
        /// <summary>Radix settings for the value conversion.</summary>
        public RadixType Radix;
        /// <summary>If true, the value will be bitwise inverted.</summary>
        public bool Invert;
        /// <summary>If true, the value will be bitwise reversed.</summary>
        public bool Reverse;
        /// <summary>True, if this signal is an input.</summary>
        public readonly bool Input;

        /// <summary>
        /// Creates the DisplaySignal instance nd initializing all fields.
        /// </summary>
        /// <param name="ScreenName">Screen name to be assigned.</param>
        public DisplaySignal(string ScreenName) : base()
        {
            this.DisplayPins = null;
            this.ScreenName = ScreenName;
            this.Radix = RadixType.Hexadecimal;
            this.Expanded = false;
            this.Moved = false;
            this.Input = false;
        }

        /// <summary>
        /// Creates the DisplaySignal instance nd initializing all fields.
        /// </summary>
        /// <param name="Element">Reference to the schematics element.</param>
        /// <param name="Pin">Array of pins to be assigned.</param>
        /// <param name="ScreenName">Screen name to be assigned.</param>
        /// <param name="Input">Value for the Input field.</param>
        public DisplaySignal(BaseElement Element, Pin[] Pins, string ScreenName, bool Input) : base()
        {
            this.element = Element;
            this.pins= Pins;
            this.DisplayPins = new DisplayPin[Pins.Length];
            for (int i = 0; i < Pins.Length; i++)
                DisplayPins[i] = new DisplayPin(Pins[i]);
            this.ScreenName = ScreenName;
            this.Radix = RadixType.Hexadecimal;
            this.Expanded = false;
            this.Input = Input;
        }


        /// <summary>
        /// Builds a common name from the pin names.
        /// </summary>
        /// <param name="Pin">Pin array to anaylze</param>
        /// <returns>Name extracted from the pins.</returns>
        public static string GetBusName(Pin[] Pin)
        {
            if (Pin.Length == 1)
                return Pin[0].Name;

            string s = "";
            for (int i = 0; i < Pin[0].Name.Length; i++)
            {
                bool common = true;
                for (int j = 1; j < Pin.Length; j++)
                {
                    if ((i < Pin[j].Name.Length) && (Pin[0].Name[i] != Pin[j].Name[i]))
                    {
                        common = false;
                        break;
                    }
                }
                if (common)
                    s += Pin[0].Name[i];
            }
            return s;
        }


        /// <summary>
        /// Provides the ability for a customized code conversion, used for Mnemonic.
        /// If the element is not a CustomBus, the default conversion is to hexadecimal.
        /// </summary>
        /// <param name="Code">Code to be converted into a string value.</param>
        /// <returns>String representation of the code.</returns>
        public string CustomConvert(uint Code)
        {
            CustomBus cb = element as CustomBus;
            if (cb == null)
                return Code.ToString("X");
            else
                return cb.CustomConvert(Code);
        }

        /// <summary>
        /// Returns the element.
        /// </summary>
        public BaseElement Element
        {
            get { return element; }
        }

        /// <summary>
        /// Returns the pin objects.
        /// </summary>
        public Pin[] Pins
        {
            get { return pins; }
        }

        /// <summary>
        /// Returns true, if the signal can be expanded.
        /// </summary>
        public bool Expandable
        {
            get { return DisplayPins.Length > 1; }
        }

        /// <summary>
        /// Returns true, if a custom conversion is available.
        /// </summary>
        public bool CustomConversion
        {
            get { return (element is CustomBus); }
        }
    }


}
